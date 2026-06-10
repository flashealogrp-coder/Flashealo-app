import os
import random
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
import yaml

# =========================
# CONFIG
# =========================

XML_FILE = "annotations.xml"
IMAGES_DIR = "images"
OUTPUT_DIR = "yolo_dataset"

TRAIN_RATIO = 0.8

CLASS_MAP = {
    "number": 0
}

# =========================
# CREATE FOLDERS
# =========================

for split in ["train", "val"]:
    os.makedirs(f"{OUTPUT_DIR}/images/{split}", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/labels/{split}", exist_ok=True)

# =========================
# PARSE XML
# =========================

tree = ET.parse(XML_FILE)
root = tree.getroot()

images_data = []

for image in root.findall("image"):

    image_name = Path(image.get("name")).name
    width = float(image.get("width"))
    height = float(image.get("height"))

    labels = []

    for box in image.findall("box"):

        label = box.get("label")

        if label not in CLASS_MAP:
            continue

        class_id = CLASS_MAP[label]

        xtl = float(box.get("xtl"))
        ytl = float(box.get("ytl"))
        xbr = float(box.get("xbr"))
        ybr = float(box.get("ybr"))

        # YOLO format
        x_center = ((xtl + xbr) / 2) / width
        y_center = ((ytl + ybr) / 2) / height
        bbox_width = (xbr - xtl) / width
        bbox_height = (ybr - ytl) / height

        labels.append(
            f"{class_id} "
            f"{x_center:.6f} "
            f"{y_center:.6f} "
            f"{bbox_width:.6f} "
            f"{bbox_height:.6f}"
        )

    images_data.append({
        "image_name": image_name,
        "labels": labels
    })

# =========================
# SPLIT TRAIN / VAL
# =========================

random.shuffle(images_data)

split_index = int(len(images_data) * TRAIN_RATIO)

train_data = images_data[:split_index]
val_data = images_data[split_index:]

# =========================
# SAVE FILES
# =========================

def save_split(data, split):

    for item in data:

        image_name = item["image_name"]

        src_image = os.path.join(IMAGES_DIR, image_name)

        dst_image = os.path.join(
            OUTPUT_DIR,
            "images",
            split,
            image_name
        )

        shutil.copy(src_image, dst_image)

        label_name = Path(image_name).stem + ".txt"

        dst_label = os.path.join(
            OUTPUT_DIR,
            "labels",
            split,
            label_name
        )

        with open(dst_label, "w") as f:
            f.write("\n".join(item["labels"]))

save_split(train_data, "train")
save_split(val_data, "val")

# =========================
# CREATE data.yaml
# =========================

yaml_data = {
    "path": os.path.abspath(OUTPUT_DIR),
    "train": "images/train",
    "val": "images/val",
    "names": {
        0: "number"
    }
}

with open(f"{OUTPUT_DIR}/data.yaml", "w") as f:
    yaml.dump(yaml_data, f)

print("===================================")
print("DONE!")
print(f"Dataset saved to: {OUTPUT_DIR}")
print("===================================")