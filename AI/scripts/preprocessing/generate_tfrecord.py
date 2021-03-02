import os
import io

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow logging (1)
import tensorflow.compat.v1 as tf
from object_detection.utils import dataset_util, label_map_util


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

    encoded_image_io = io.BytesIO()
    image.save(encoded_image_io, 'png')
    encoded_image = encoded_image_io.getvalue()
    width, height = image.size

    xmins = []
    xmaxs = []
    ymins = []
    ymaxs = []
    classes_text = []
    classes = []

    for x1, y1, x2, y2, annotation_class in normalized_annotations:
        xmins.append(x1)
        xmaxs.append(x2)
        ymins.append(y1)
        ymaxs.append(y2)
        classes_text.append(annotation_class.encode('utf8'))
        classes.append(class_text_to_int(annotation_class, label_map))

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
    return tf_example
