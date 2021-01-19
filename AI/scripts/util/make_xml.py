"""
Generate the XML files of images to be used in TFRecord creation. Output of the function mimics output from LabelImg
program.

@author: Ian Randman
"""

from lxml import etree
from lxml.etree import Element, SubElement


def make_xml(annotations, image_width, image_height, filepath, annotation_class="caribou"):
    """
    Generate the XML files of images to be used in TFRecord creation. Output of the function mimics output from
    LabelImg program. Order of tags matters.

    :param annotations: the x and y coordinates for the top left and bottom right of the annotation bounding box
    :param image_width: the width of the image
    :param image_height: the height of the image
    :param filepath: the full filepath of the output image/XML excluding extension
    :param annotation_class: the class of the annotation
    :return: none
    """

    # establish required field variables
    annotation_pose = "Unspecified"
    annotation_truncated = 0
    annotation_difficult = 0
    fields = filepath.split("/")

    # Establish xml tree structure
    root = Element('annotation')

    folder = SubElement(root, 'folder')
    folder.text = fields[-2]

    filename = SubElement(root, 'filename')
    filename.text = fields[-1] + '.png'

    path = SubElement(root, 'path')
    path.text = filepath + '.png'

    source = SubElement(root, 'source')
    database = SubElement(source, 'database')
    database.text = 'Unknown'

    size = SubElement(root, 'size')

    segmented = SubElement(root, 'segmented')
    segmented.text = '0'

    width = SubElement(size, 'width')
    width.text = str(image_width)
    height = SubElement(size, 'height')
    height.text = str(image_height)
    depth = SubElement(size, 'depth')
    depth.text = '3'

    # iterate over all annotations in image
    for x1, y1, x2, y2 in annotations:
        object = SubElement(root, 'object')

        name = SubElement(object, "name")
        name.text = annotation_class

        pose = SubElement(object, 'pose')
        pose.text = annotation_pose

        truncated = SubElement(object, 'truncated')
        truncated.text = str(annotation_truncated)

        difficult = SubElement(object, 'difficult')
        difficult.text = str(annotation_difficult)

        bndbox = SubElement(object, 'bndbox')

        xmin = SubElement(bndbox, 'xmin')
        xmin.text = str(x1)
        ymin = SubElement(bndbox, 'ymin')
        ymin.text = str(y1)
        xmax = SubElement(bndbox, 'xmax')
        xmax.text = str(x2)
        ymax = SubElement(bndbox, 'ymax')
        ymax.text = str(y2)

    xml_object = etree.tostring(root,
                                pretty_print=True,
                                # xml_declaration=True,
                                encoding='UTF-8')

    with open(f'{filepath}.xml', 'wb+') as writer:
        writer.write(xml_object)

