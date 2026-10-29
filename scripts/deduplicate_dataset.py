import json
import os
import sys

def deduplicate_dataset():
    dataset_dir = os.path.abspath(r"C:\project\sih-1\AICTE-ICMS\All-India-Institutions-Data-main\All-India-Institutions-Data-main\dataset")
    all_inst_file = os.path.join(dataset_dir, "all-institutions.json")
    metadata_file = os.path.join(dataset_dir, "metadata.json")

    print(f"Loading {all_inst_file}...")
    with open(all_inst_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_records = len(data)
    print(f"Total raw records in all-institutions.json: {total_records}")

    seen_ids = set()
    deduped = []
    for item in data:
        aid = item.get("aicte_id") or item.get("id")
        if not aid:
            deduped.append(item)
            continue
        if aid not in seen_ids:
            seen_ids.add(aid)
            deduped.append(item)

    print(f"Deduplicated records count: {len(deduped)} (removed {total_records - len(deduped)} duplicates)")

    print(f"Writing deduplicated data back to {all_inst_file}...")
    with open(all_inst_file, "w", encoding="utf-8") as f:
        json.dump(deduped, f, indent=2, ensure_ascii=False)

    print(f"Updating {metadata_file}...")
    metadata = {}
    if os.path.exists(metadata_file):
        with open(metadata_file, "r", encoding="utf-8") as f:
            try:
                metadata = json.load(f)
            except Exception:
                metadata = {}
    metadata["records"] = len(deduped)
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("Deduplication complete successfully!")

if __name__ == "__main__":
    deduplicate_dataset()
