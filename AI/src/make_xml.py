from lxml import etree
from lxml.etree import Element, SubElement, ElementTree


def make_xml(annotations, w, h, filename_prefix):
    root = Element('annotation')
    size = SubElement(root, 'size')

    width = SubElement(size, 'width')
    width.text = str(w)
    height = SubElement(size, 'height')
    height.text = str(h)
    depth = SubElement(size, 'depth')
    depth.text = '3'

    for x1, y1, x2, y2 in annotations:
        object = SubElement(root, 'object')
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

    with open(f'{filename_prefix}.xml', 'wb') as writer:
        writer.write(xml_object)

    # tree = ElementTree(root)
    # with open(filename_prefix + '.xml', "wb") as f:
    #     tree.write(f)
