"""
Provides a function to create a single TF Example.
This is used in a larger effort to create TFRecords for training and evaluation.
"""

__author__ = 'Ian Randman'

import logging
import os
import io

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

import tensorflow as tf
from object_detection.utils import dataset_util, label_map_util

logger = logging.getLogger(__name__)


def class_text_to_int(row_label, label_map):
    """
    Convert a label to an int using a label map.

    :param row_label: the label
    :param label_map: the label map object containing information about annotation classes
    :return: the int for this label
    """

    label_map_dict = label_map_util.get_label_map_dict(label_map)
    return label_map_dict[row_label]


def create_tf_example(normalized_annotations, image, label_map):
    """
    Create a TF Example from an image and its annotations.

    :param normalized_annotations: the normalized annotations (x1, y1, x2, y2, label)
    :param image: the PIL image
    :param label_map: the label map object containing information about annotation classes
    :return: the created TF example
    """

    # encode the image as bytes
    encoded_image_io = io.BytesIO()
    image.save(encoded_image_io, 'png')
    encoded_image = encoded_image_io.getvalue()

    # get the dimensions of the image
    width, height = image.size

    # store the details for each annotation
    xmins = list()
    xmaxs = list()
    ymins = list()
    ymaxs = list()
    classes_text = list()
    classes = list()

    # iterate over all annotations and extract each part
    for x1, y1, x2, y2, annotation_class in normalized_annotations:
        xmins.append(x1)
        xmaxs.append(x2)
        ymins.append(y1)
        ymaxs.append(y2)
        classes_text.append(annotation_class.encode('utf8'))
        classes.append(class_text_to_int(annotation_class, label_map))

    # create the TF Example
    tf_example = tf.train.Example(features=tf.train.Features(feature={
        'image/height': dataset_util.int64_feature(height),
        'image/width': dataset_util.int64_feature(width),
        'image/encoded': dataset_util.bytes_feature(encoded_image),
        'image/object/bbox/xmin': dataset_util.float_list_feature(xmins),
        'image/object/bbox/xmax': dataset_util.float_list_feature(xmaxs),
        'image/object/bbox/ymin': dataset_util.float_list_feature(ymins),
        'image/object/bbox/ymax': dataset_util.float_list_feature(ymaxs),
        'image/object/class/text': dataset_util.bytes_list_feature(classes_text),
        'image/object/class/label': dataset_util.int64_list_feature(classes),
    }))

    logger.debug('Created TF Example')

    # return the TF Example
    return tf_example
