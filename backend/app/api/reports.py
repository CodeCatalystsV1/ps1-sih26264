from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode
from backend.app.models.entities import User, Case, Institution, Bureau, WorkflowHistory
from backend.app.schemas.all_schemas import (
    DashboardMetricsOut, StatusDistribution, BureauWorkload, RegionWorkload, AgeingBand, WorkflowHistoryOut
)
from backend.app.services.report_service import (
    get_dashboard_metrics, get_ageing_distribution, get_bureau_workload_report,
    get_regional_distribution_report, export_cases_to_csv, export_cases_to_excel, export_cases_to_pdf
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/dashboard", response_model=DashboardMetricsOut)
def get_dashboard_summary(
    bureau_id: Optional[int] = Query(None),
    region_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_roles = [r.code for r in current_user.roles]
    if RoleCode.REGIONAL_OFFICE in user_roles and RoleCode.ADMIN not in user_roles:
        reg_ids = [ba.region_id for ba in current_user.bureau_assignments if ba.region_id is not None]
        if reg_ids:
            region_id = reg_ids[0]

    return get_dashboard_metrics(db, bureau_id=bureau_id, region_id=region_id)

@router.get("/status-distribution", response_model=List[StatusDistribution])
def get_status_distribution(
    bureau_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Case.status, func.count(Case.id)).group_by(Case.status)
    if bureau_id:
        query = query.filter(Case.current_bureau_id == bureau_id)
    rows = query.all()
    return [StatusDistribution(status=r[0], count=r[1]) for r in rows]

@router.get("/bureau-workload", response_model=List[BureauWorkload])
def get_bureau_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_bureau_workload_report(db)
    return [BureauWorkload(**d) for d in data]

@router.get("/regional", response_model=List[RegionWorkload])
def get_regional_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_regional_distribution_report(db)
    return [RegionWorkload(**d) for d in data]

@router.get("/ageing", response_model=List[AgeingBand])
def get_case_ageing(
    bureau_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = get_ageing_distribution(db, bureau_id=bureau_id)
    return [AgeingBand(**d) for d in data]

@router.get("/recent-activity", response_model=List[WorkflowHistoryOut])
def get_recent_activity(
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(WorkflowHistory).order_by(WorkflowHistory.created_at.desc()).limit(limit).all()
    return [
        WorkflowHistoryOut(
            id=w.id,
            action_type=w.action_type,
            previous_value=w.previous_value,
            new_value=w.new_value,
            remarks=w.remarks,
            performed_by_name=w.actor.display_name if w.actor else "System",
            created_at=w.created_at
        ) for w in history
    ]

@router.get("/export")
def export_report_data(
    format: str = Query("csv", pattern="^(csv|excel|pdf)$"),
    bureau_id: Optional[int] = Query(None),
    region_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.BUREAU_HEAD, RoleCode.MANAGEMENT, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER, RoleCode.REGIONAL_OFFICE]))
):
    # Query cases with filters
    query = db.query(Case)
    if bureau_id:
        query = query.filter(Case.current_bureau_id == bureau_id)
    if region_id:
        query = query.join(Institution).filter(Institution.region_id == region_id)
    if status and status != "ALL":
        query = query.filter(Case.status == status)

    cases = query.order_by(Case.created_at.desc()).all()

    # Log audit event
    log_audit_event(
        db=db,
        action_type="EXPORT_REPORT",
        record_type="Report",
        record_id=format,
        user_id=current_user.id,
        metadata={"format": format, "record_count": len(cases), "bureau_id": bureau_id, "region_id": region_id}
    )

    if format == "csv":
        csv_content = export_cases_to_csv(cases)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=aicte_icms_cases_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    elif format == "excel":
        excel_bytes = export_cases_to_excel(cases)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=aicte_icms_cases_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
        )
    elif format == "pdf":
        pdf_bytes = export_cases_to_pdf(cases)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=aicte_icms_cases_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
        )
