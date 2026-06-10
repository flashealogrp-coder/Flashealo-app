import xml.etree.ElementTree as ET
import os

def convert_bbox(size, box):
    dw = 1. / size[0]
    dh = 1. / size[1]
    x = (box[0] + box[1]) / 2.0
    y = (box[2] + box[3]) / 2.0
    w = box[1] - box[0]
    h = box[3] - box[2]
    return (x * dw, y * dh, w * dw, h * dh)

def xml_to_yolo(xml_path, output_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    size = root.find('size')
    w = int(size.find('width').text)
    h = int(size.find('height').text)

    with open(output_path, 'w') as out_file:
        for obj in root.iter('object'):
            cls = obj.find('name').text
            # AQUÍ: Cambia 'dorsal' por el nombre de la clase que aparece en tu XML
            if cls == 'dorsal': cls_id = 0 
            else: continue 

            xmlbox = obj.find('bndbox')
            b = (float(xmlbox.find('xmin').text), float(xmlbox.find('xmax').text),
                 float(xmlbox.find('ymin').text), float(xmlbox.find('ymax').text))
            bb = convert_bbox((w, h), b)
            out_file.write(f"{cls_id} {' '.join([str(a) for a in bb])}\n")

# Ejecuta esto en tu carpeta de anotaciones
# xml_to_yolo('archivo.xml', 'archivo.txt')