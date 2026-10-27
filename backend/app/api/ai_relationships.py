"""
AICTE Case360+ — AI Complaint Relationship API Router
Phase 3H: Endpoints for ML inference, relationship listing, officer review, and audit trail (SIH 26264)
"""

import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode
from backend.app.models.entities import (
    User, Complaint, Institution, Bureau, ComplaintCategory,
    AIRelationshipSuggestion, ComplaintEmbedding, AuditLog
)
from backend.app.schemas.all_schemas import (
    AIMatchComplaintRequest, AIMatchComplaintResponse,
    AIRelationshipItem, AIRelationshipReviewRequest, AIOverviewStats
)
from backend.app.services.complaint_matching_service import ComplaintMatchingService
from backend.app.ml.config import MLConfig

router = APIRouter(prefix="/ai", tags=["AI Complaint Relationship Intelligence"])


def enrich_suggestion_out(sug: AIRelationshipSuggestion) -> AIRelationshipItem:
    src = sug.source_complaint
    cand = sug.candidate_complaint
    inst = sug.institution

    explanations = []
    if sug.explanation:
        try:
            explanations = json.loads(sug.explanation)
            if not isinstance(explanations, list):
                explanations = [str(explanations)]
        except Exception:
            explanations = [sug.explanation]

    is_cross = False
    if src and cand and src.assigned_bureau_id and cand.assigned_bureau_id:
        is_cross = (src.assigned_bureau_id != cand.assigned_bureau_id)

    src_bureau_name = src.assigned_bureau.name if (src and src.assigned_bureau) else None
    cand_bureau_name = cand.assigned_bureau.name if (cand and cand.assigned_bureau) else None
    cand_category_name = cand.category.name if (cand and cand.category) else None

    # Suggested action based on classification and bureau
    if sug.match_classification == "POSSIBLY_RELATED":
        suggested_action = "COORDINATE" if is_cross else "OFFICER_REVIEW"
    elif sug.match_classification == "NEEDS_REVIEW":
        suggested_action = "OFFICER_REVIEW"
    elif sug.match_classification == "INSTITUTION_UNCONFIRMED":
        suggested_action = "VERIFY_INSTITUTION"
    else:
        suggested_action = "NO_ACTION"

    return AIRelationshipItem(
        id=sug.id,
        source_complaint_id=sug.source_complaint_id,
        source_reference=src.complaint_reference if src else f"CMP-{sug.source_complaint_id}",
        source_title=src.title if src else "Source Grievance",
        source_bureau=src_bureau_name,
        candidate_complaint_id=sug.candidate_complaint_id,
        candidate_reference=cand.complaint_reference if cand else f"CMP-{sug.candidate_complaint_id}",
        candidate_title=cand.title if cand else "Candidate Grievance",
        candidate_description=cand.description if cand else None,
        candidate_category=cand_category_name,
        candidate_bureau=cand_bureau_name,
        candidate_status=cand.status if cand else "REGISTERED",
        institution_id=sug.institution_id,
        institution_name=inst.institution_name if inst else "Unknown Institution",
        permanent_id=inst.permanent_id if inst else "N/A",
        semantic_similarity=sug.semantic_similarity,
        match_classification=sug.match_classification,
        explanation=explanations,
        status=sug.status,
        suggested_action=suggested_action,
        is_cross_bureau=is_cross,
        created_at=sug.created_at,
        reviewed_at=sug.reviewed_at,
        reviewed_by_id=sug.reviewed_by_id,
        reviewed_by_name=sug.reviewer.display_name if sug.reviewer else None,
        review_notes=sug.review_notes,
    )


@router.get("/stats", response_model=AIOverviewStats)
def get_ai_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns live database-backed overview statistics for the AI Relationship Dashboard.
    """
    pending = db.query(AIRelationshipSuggestion).filter(
        AIRelationshipSuggestion.status == "PENDING_REVIEW"
    ).count()
    approved = db.query(AIRelationshipSuggestion).filter(
        AIRelationshipSuggestion.status == "APPROVED_LINK"
    ).count()
    dismissed = db.query(AIRelationshipSuggestion).filter(
        AIRelationshipSuggestion.status == "DISMISSED"
    ).count()
    total_embeddings = db.query(ComplaintEmbedding).count()

    return AIOverviewStats(
        pending_suggestions_count=pending,
        approved_links_count=approved,
        dismissed_suggestions_count=dismissed,
        total_analyzed_complaints_count=total_embeddings,
        model_identifier=MLConfig.MODEL_NAME,
        model_device=MLConfig.DEVICE,
    )


@router.post("/match-complaint", response_model=AIMatchComplaintResponse)
def match_complaint_ai(
    req: AIMatchComplaintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes actual Multilingual E5-small semantic inference, institution matching,
    and hybrid scoring for a complaint. Persists relationship suggestions and returns ranked candidates.
    """
    source = (
        db.query(Complaint)
        .options(
            joinedload(Complaint.institution),
            joinedload(Complaint.category),
            joinedload(Complaint.assigned_bureau),
        )
        .filter(Complaint.id == req.complaint_id)
        .first()
    )

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {req.complaint_id} not found."
        )

    # Total potential candidate pool count
    total_candidates = db.query(Complaint).filter(Complaint.id != source.id).count()

    # Execute ML pipeline & persistence
    suggestions = ComplaintMatchingService.match_and_persist_suggestions(
        db=db,
        source_complaint_id=source.id,
        top_k=req.top_k,
        min_similarity=req.min_similarity,
    )

    # Re-query suggestions with joined entities for response enrichment
    sug_ids = [s.id for s in suggestions]
    enriched_sugs = (
        db.query(AIRelationshipSuggestion)
        .options(
            joinedload(AIRelationshipSuggestion.source_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.category),
            joinedload(AIRelationshipSuggestion.institution),
            joinedload(AIRelationshipSuggestion.reviewer),
        )
        .filter(AIRelationshipSuggestion.id.in_(sug_ids))
        .all()
    )

    items = [enrich_suggestion_out(s) for s in enriched_sugs]
    items.sort(key=lambda x: -x.semantic_similarity)

    return AIMatchComplaintResponse(
        source_complaint_id=source.id,
        source_reference=source.complaint_reference,
        source_title=source.title,
        source_description=source.description,
        institution_id=source.institution_id,
        institution_name=source.institution.institution_name if source.institution else None,
        permanent_id=source.institution.permanent_id if source.institution else None,
        total_candidates_analyzed=total_candidates,
        suggestions_count=len(items),
        suggestions=items,
    )


@router.get("/relationships", response_model=List[AIRelationshipItem])
def list_ai_relationships(
    status_filter: Optional[str] = Query(None, alias="status"),
    institution_id: Optional[int] = Query(None),
    complaint_id: Optional[int] = Query(None),
    classification: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists AI relationship suggestions with filtering by review status, institution, and classification.
    """
    query = (
        db.query(AIRelationshipSuggestion)
        .options(
            joinedload(AIRelationshipSuggestion.source_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.category),
            joinedload(AIRelationshipSuggestion.institution),
            joinedload(AIRelationshipSuggestion.reviewer),
        )
    )

    if status_filter and status_filter != "ALL":
        query = query.filter(AIRelationshipSuggestion.status == status_filter)

    if institution_id:
        query = query.filter(AIRelationshipSuggestion.institution_id == institution_id)

    if complaint_id:
        query = query.filter(
            or_(
                AIRelationshipSuggestion.source_complaint_id == complaint_id,
                AIRelationshipSuggestion.candidate_complaint_id == complaint_id,
            )
        )

    if classification and classification != "ALL":
        query = query.filter(AIRelationshipSuggestion.match_classification == classification)

    suggestions = (
        query.order_by(
            AIRelationshipSuggestion.created_at.desc(),
            AIRelationshipSuggestion.semantic_similarity.desc(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [enrich_suggestion_out(s) for s in suggestions]


@router.get("/relationships/{id}", response_model=AIRelationshipItem)
def get_ai_relationship_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a single AI relationship suggestion by ID with complete evidence.
    """
    sug = (
        db.query(AIRelationshipSuggestion)
        .options(
            joinedload(AIRelationshipSuggestion.source_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.category),
            joinedload(AIRelationshipSuggestion.institution),
            joinedload(AIRelationshipSuggestion.reviewer),
        )
        .filter(AIRelationshipSuggestion.id == id)
        .first()
    )

    if not sug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relationship suggestion with ID {id} not found."
        )

    return enrich_suggestion_out(sug)


@router.post("/relationships/{id}/review", response_model=AIRelationshipItem)
def review_ai_relationship(
    id: int,
    req: AIRelationshipReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Human-in-the-Loop officer decision endpoint:
    Authorized officers can APPROVE_LINK (confirm related issue) or DISMISS (false positive).
    Decision is recorded immutably with reviewer ID, timestamp, and audit trail.
    Does NOT automatically merge, delete, or transfer complaints.
    """
    decision = req.decision.strip().upper()
    if decision not in ("APPROVE_LINK", "DISMISS"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review decision. Supported decisions are 'APPROVE_LINK' and 'DISMISS'."
        )

    if not req.review_notes or not req.review_notes.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review notes are mandatory to record administrative justification."
        )

    sug = (
        db.query(AIRelationshipSuggestion)
        .options(
            joinedload(AIRelationshipSuggestion.source_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.assigned_bureau),
            joinedload(AIRelationshipSuggestion.candidate_complaint).joinedload(Complaint.category),
            joinedload(AIRelationshipSuggestion.institution),
        )
        .filter(AIRelationshipSuggestion.id == id)
        .first()
    )

    if not sug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relationship suggestion with ID {id} not found."
        )

    now = datetime.now(timezone.utc)
    previous_status = sug.status
    new_status = "APPROVED_LINK" if decision == "APPROVE_LINK" else "DISMISSED"

    sug.status = new_status
    sug.reviewed_by_id = current_user.id
    sug.reviewed_at = now
    sug.review_notes = req.review_notes.strip()
    sug.updated_at = now

    # Write immutable audit trail
    audit_event = AuditLog(
        user_id=current_user.id,
        action_type=f"AI_RELATIONSHIP_{decision}",
        record_type="AIRelationshipSuggestion",
        record_id=str(sug.id),
        outcome="SUCCESS",
        metadata_json=json.dumps({
            "suggestion_id": sug.id,
            "decision": decision,
            "previous_status": previous_status,
            "new_status": new_status,
            "source_complaint_id": sug.source_complaint_id,
            "candidate_complaint_id": sug.candidate_complaint_id,
            "semantic_similarity": sug.semantic_similarity,
            "match_classification": sug.match_classification,
            "reviewer_name": current_user.display_name,
            "reviewer_email": current_user.email,
            "notes": req.review_notes.strip(),
        }),
        created_at=now,
    )
    db.add(audit_event)

    db.commit()
    db.refresh(sug)

    return enrich_suggestion_out(sug)
