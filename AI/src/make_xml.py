from lxml import etree
from lxml.etree import Element, SubElement, ElementTree


def make_xml(annotations, w, h, file_path, annotation_name="caribou"):
    # establish required field variables
    annotation_pose = "Unspecified"
    annotation_truncated = 0
    annotation_difficult = 0
    fields = file_path.split("/")

    # Establish xml tree structure
    root = Element('annotation')

    folder = SubElement(root, 'folder')
    folder.text = fields[-2]

    filename = SubElement(root, 'filename')
    filename.text = fields[-1]

    path = SubElement(root, 'path')
    path.text = file_path + ".png"

    size = SubElement(root, 'size')

    width = SubElement(size, 'width')
    width.text = str(w)
    height = SubElement(size, 'height')
    height.text = str(h)
    depth = SubElement(size, 'depth')
    depth.text = '3'

    for x1, y1, x2, y2 in annotations:
        object = SubElement(root, 'object')

        name = SubElement(object, "name")
        name.text = annotation_name

        pose = SubElement(object, 'pose')
        pose.text = annotation_pose

        truncated = SubElement(object, 'truncated')
        truncated.text = str(annotation_truncated)

        difficult = SubElement(object, 'difficult')
        difficult.text = str(annotation_difficult)

        bndbox = SubElement(object, 'bndbox')

        xmin = SubElement(bndbox, 'xmin')
        xmin.text = str(x1)
        xmax = SubElement(bndbox, 'xmax')
        xmax.text = str(x2)
        ymin = SubElement(bndbox, 'ymin')
        ymin.text = str(y1)
        ymax = SubElement(bndbox, 'ymax')
        ymax.text = str(y2)

    xml_object = etree.tostring(root,
                                pretty_print=True,
                                # xml_declaration=True,
                                encoding='UTF-8')
    f = open(F'{file_path}.xml', 'wb+')

    with open(f'{file_path}.xml', 'wb+') as writer:
        writer.write(xml_object)

    # tree = ElementTree(root)
    # with open(filename_prefix + '.xml', "wb") as f:
    #     tree.write(f)
