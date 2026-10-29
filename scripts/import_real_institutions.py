import os
import sys
import json
import re
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import SessionLocal, engine
from backend.app.models.entities import Institution, Region, User

STATE_TO_REGION = {
    # Northern Region (NRO) - Kanpur (region_id 1)
    "uttar pradesh": (1, "Kanpur"),
    "uttarakhand": (1, "Kanpur"),
    "bihar": (1, "Kanpur"),
    "delhi": (1, "Kanpur"),
    "haryana": (1, "Kanpur"),
    "punjab": (1, "Kanpur"),
    "rajasthan": (1, "Kanpur"),
    "himachal pradesh": (1, "Kanpur"),
    "jammu and kashmir": (1, "Kanpur"),
    "chandigarh": (1, "Kanpur"),

    # Western Region (WRO) - Mumbai (region_id 2)
    "maharashtra": (2, "Mumbai"),
    "gujarat": (2, "Mumbai"),
    "goa": (2, "Mumbai"),
    "madhya pradesh": (2, "Mumbai"),
    "dadra and nagar haveli": (2, "Mumbai"),
    "daman and diu": (2, "Mumbai"),

    # Southern Region (SRO) - Chennai (region_id 3)
    "tamil nadu": (3, "Chennai"),
    "karnataka": (3, "Chennai"),
    "andhra pradesh": (3, "Chennai"),
    "telangana": (3, "Chennai"),
    "kerala": (3, "Chennai"),
    "puducherry": (3, "Chennai"),
    "andaman and nicobar islands": (3, "Chennai"),

    # Eastern Region (ERO) - Kolkata (region_id 4)
    "west bengal": (4, "Kolkata"),
    "odisha": (4, "Kolkata"),
    "orissa": (4, "Kolkata"),
    "jharkhand": (4, "Kolkata"),
    "chhattisgarh": (4, "Kolkata"),
    "assam": (4, "Kolkata"),
    "meghalaya": (4, "Kolkata"),
    "manipur": (4, "Kolkata"),
    "mizoram": (4, "Kolkata"),
    "nagaland": (4, "Kolkata"),
    "tripura": (4, "Kolkata"),
    "arunachal pradesh": (4, "Kolkata"),
    "sikkim": (4, "Kolkata"),
}

# 10 Selected Landmark Institutions mapped to existing seed IDs 1..10
PRIMARY_SEED_REPLACEMENTS = {
    1: {
        "permanent_id": "1-44642766198",
        "institution_name": "GALGOTIAS COLLEGE OF ENGINEERING & TECHNOLOGY",
        "institution_type": "Engineering & Technology",
        "address": "1, Knowledge Park-II, Greater Noida",
        "city": "Greater Noida",
        "district": "Gautam Buddha Nagar",
        "state": "Uttar Pradesh",
        "region_id": 1,
        "regional_office": "Kanpur",
        "postal_code": "201306",
        "contact_email": "director@galgotiacollege.edu",
        "contact_phone": "0120-4513800",
    },
    2: {
        "permanent_id": "1-44642983297",
        "institution_name": "SCTR'S PUNE INSTITUTE OF COMPUTER TECHNOLOGY",
        "institution_type": "Engineering & Technology",
        "address": "Survey No. 27, Near Trimurti Chowk, Bharati Vidyapeeth Campus, Dhankawadi",
        "city": "Pune",
        "district": "Pune",
        "state": "Maharashtra",
        "region_id": 2,
        "regional_office": "Mumbai",
        "postal_code": "411043",
        "contact_email": "principal@pict.edu",
        "contact_phone": "020-24371101",
    },
    3: {
        "permanent_id": "1-44638516258",
        "institution_name": "MADRAS SCHOOL OF ECONOMICS",
        "institution_type": "Management",
        "address": "Behind Anna Centenary Library, Gandhi Mandapam Road, Kottur",
        "city": "Chennai",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "region_id": 3,
        "regional_office": "Chennai",
        "postal_code": "600025",
        "contact_email": "director@mse.ac.in",
        "contact_phone": "044-22300701",
    },
    4: {
        "permanent_id": "1-44641836728",
        "institution_name": "GOVERNMENT COLLEGE OF ENGINEERING AND LEATHER TECHNOLOGY",
        "institution_type": "Engineering & Technology",
        "address": "LB Block, Sector III, Salt Lake City",
        "city": "Kolkata",
        "district": "North 24 Parganas",
        "state": "West Bengal",
        "region_id": 4,
        "regional_office": "Kolkata",
        "postal_code": "700106",
        "contact_email": "principal@gcelt.gov.in",
        "contact_phone": "033-23358348",
    },
    5: {
        "permanent_id": "1-44640076273",
        "institution_name": "JAIPUR ENGINEERING COLLEGE AND RESEARCH CENTRE",
        "institution_type": "Engineering & Technology",
        "address": "JECRC Campus, Shri Ram Ki Nangal, Via Vatika, Tonk Road",
        "city": "Jaipur",
        "district": "Jaipur",
        "state": "Rajasthan",
        "region_id": 1,
        "regional_office": "Kanpur",
        "postal_code": "302022",
        "contact_email": "principal@jecrc.ac.in",
        "contact_phone": "0141-2770232",
    },
    6: {
        "permanent_id": "1-44641783475",
        "institution_name": "R.V. COLLEGE OF ENGINEERING",
        "institution_type": "Engineering & Technology",
        "address": "RV Vidyaniketan Post, Mysore Road",
        "city": "Bengaluru",
        "district": "Bangalore Urban",
        "state": "Karnataka",
        "region_id": 3,
        "regional_office": "Chennai",
        "postal_code": "560059",
        "contact_email": "principal@rvce.edu.in",
        "contact_phone": "080-68188111",
    },
    7: {
        "permanent_id": "1-44638374598",
        "institution_name": "ST MARYS CENTENARY COLLEGE OF MANAGEMENT",
        "institution_type": "Management",
        "address": "PR No. 9-1-257/1, Regimental Bazar, Secunderabad",
        "city": "Hyderabad",
        "district": "Hyderabad",
        "state": "Telangana",
        "region_id": 3,
        "regional_office": "Chennai",
        "postal_code": "500025",
        "contact_email": "principal@stmaryscollege.in",
        "contact_phone": "040-27711488",
    },
    8: {
        "permanent_id": "1-44640144514",
        "institution_name": "DELHI TECHNOLOGICAL UNIVERSITY",
        "institution_type": "Engineering & Technology",
        "address": "Shahbad Daulatpur, Bawana Road",
        "city": "New Delhi",
        "district": "North West Delhi",
        "state": "Delhi",
        "region_id": 1,
        "regional_office": "Kanpur",
        "postal_code": "110042",
        "contact_email": "registrar@dtu.ac.in",
        "contact_phone": "011-27871018",
    },
    9: {
        "permanent_id": "1-44638345258",
        "institution_name": "SURYODAYA COLLEGE OF ENGINEERING & TECHNOLOGY",
        "institution_type": "Engineering & Technology",
        "address": "Survey No. 117/1 & 117/3 A, Vihirgaon, Umrer Road",
        "city": "Nagpur",
        "district": "Nagpur",
        "state": "Maharashtra",
        "region_id": 2,
        "regional_office": "Mumbai",
        "postal_code": "441204",
        "contact_email": "principal@scetngp.com",
        "contact_phone": "07103-202206",
    },
    10: {
        "permanent_id": "1-44638508781",
        "institution_name": "BEHALA GOVERNMENT POLYTECHNIC",
        "institution_type": "Polytechnic",
        "address": "756, Upendra Nath Banerjee Road, Parnasree",
        "city": "Kolkata",
        "district": "Kolkata",
        "state": "West Bengal",
        "region_id": 4,
        "regional_office": "Kolkata",
        "postal_code": "700060",
        "contact_email": "principal@behalagovtpoly.org",
        "contact_phone": "033-24060002",
    },
}

def clean_postal_code(address_text: str) -> str:
    m = re.search(r'\b([1-9][0-9]{5})\b', address_text or "")
    return m.group(1) if m else "110001"

def import_institutions():
    print("=== AICTE ICMS: Real Institutions Dataset Importer ===")
    db = SessionLocal()

    admin_user = db.query(User).filter(User.username == "admin").first()
    admin_id = admin_user.id if admin_user else 1

    # Locate dataset file
    dataset_candidates = [
        r"C:\project\sih-1\AICTE-ICMS\All-India-Institutions-Data-main\All-India-Institutions-Data-main\dataset\all-institutions-with-programmes.json",
        r"C:\project\sih-1\AICTE-ICMS\All-India-Institutions-Data-main\dataset\all-institutions-with-programmes.json",
    ]
    dataset_file = next((p for p in dataset_candidates if os.path.exists(p)), None)
    if not dataset_file:
        print(f"Error: dataset file not found in candidates: {dataset_candidates}")
        return

    print(f"Reading real dataset from: {dataset_file}")
    with open(dataset_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Loaded {len(records)} institutions from dataset.")

    # 1. Update Existing Primary Demo Institutions (IDs 1..10)
    print("\n--- Updating Existing Institutions (IDs 1..10) with Real Data ---")
    used_perm_ids = set()
    for inst_id, data in PRIMARY_SEED_REPLACEMENTS.items():
        inst = db.query(Institution).filter(Institution.id == inst_id).first()
        if inst:
            print(f"Updating Inst ID {inst_id}: '{inst.institution_name}' -> '{data['institution_name']}' ({data['permanent_id']})")
            inst.permanent_id = data["permanent_id"]
            inst.institution_name = data["institution_name"]
            inst.institution_type = data["institution_type"]
            inst.address = data["address"]
            inst.city = data["city"]
            inst.district = data["district"]
            inst.state = data["state"]
            inst.region_id = data["region_id"]
            inst.regional_office = data["regional_office"]
            inst.postal_code = data["postal_code"]
            inst.contact_email = data["contact_email"]
            inst.contact_phone = data["contact_phone"]
            inst.verification_status = "VERIFIED"
            inst.record_status = "ACTIVE"
        else:
            inst = Institution(
                id=inst_id,
                permanent_id=data["permanent_id"],
                institution_name=data["institution_name"],
                institution_type=data["institution_type"],
                address=data["address"],
                city=data["city"],
                district=data["district"],
                state=data["state"],
                region_id=data["region_id"],
                regional_office=data["regional_office"],
                postal_code=data["postal_code"],
                contact_email=data["contact_email"],
                contact_phone=data["contact_phone"],
                verification_status="VERIFIED",
                record_status="ACTIVE",
                created_by=admin_id,
            )
            db.add(inst)
        used_perm_ids.add(data["permanent_id"])

    db.commit()
    print("Primary institutions updated and committed.")

    # 2. Insert all remaining unique institutions
    print("\n--- Inserting remaining real institutions from dataset ---")
    existing_perm_ids = set(r[0] for r in db.query(Institution.permanent_id).all())
    now = datetime.now(timezone.utc)

    batch = []
    skipped = 0
    inserted = 0

    for item in records:
        perm_id = item.get("aicte_id")
        if not perm_id:
            continue

        if perm_id in existing_perm_ids:
            skipped += 1
            continue

        existing_perm_ids.add(perm_id)

        raw_state = (item.get("state") or "").strip().lower()
        region_info = STATE_TO_REGION.get(raw_state, (1, "Kanpur"))
        reg_id, roffice = region_info

        name = (item.get("institute_name") or "Unnamed Institute").strip()
        itype = (item.get("institution_type") or "Technical Institute").strip()
        address = (item.get("address") or "Campus Address").strip()
        district = (item.get("district") or "District Headquarter").strip()
        state = (item.get("state") or "India").strip()
        city = district.title()
        postal = clean_postal_code(address)

        # Generate standard institutional contact email
        slug = re.sub(r'[^a-z0-9]', '', name[:15].lower())
        mail = f"info@{slug}.ac.in" if slug else "info@aicte-inst.edu.in"

        new_inst = Institution(
            permanent_id=perm_id,
            institution_name=name,
            institution_type=itype,
            address=address,
            city=city,
            district=district,
            state=state,
            region_id=reg_id,
            regional_office=roffice,
            postal_code=postal,
            contact_email=mail,
            contact_phone="011-29581000",
            verification_status="VERIFIED",
            record_status="ACTIVE",
            created_at=now,
            updated_at=now,
            created_by=admin_id,
        )
        batch.append(new_inst)
        inserted += 1

        if len(batch) >= 1000:
            db.bulk_save_objects(batch)
            db.commit()
            print(f"Inserted batch: total so far = {inserted}")
            batch = []

    if batch:
        db.bulk_save_objects(batch)
        db.commit()
        print(f"Final batch inserted: total new = {inserted}")

    total_in_db = db.query(Institution).count()
    print(f"\n[DONE] Total Institutions now in Database: {total_in_db} (Skipped {skipped} duplicates/primaries).")
    db.close()

if __name__ == "__main__":
    import_institutions()
