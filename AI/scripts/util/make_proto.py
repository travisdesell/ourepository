"""
From a list of labels, generate the label protbuf to be used in a TensorFlow Object Detection model.
"""

__author__ = 'David Dunlap, Ian Randman'

import logging
import os

from scripts.util.file_utils import full_path

logger = logging.getLogger(__name__)


def create_label_proto(labels, output_dir):
    """
    Create the label protobuf that assigns each label an incremental ID.
    Save the protobuf as label_map.pbtxt.

    :param labels: the list of labels
    :param output_dir: the directory where the label map should be saved
    :return: the path of the saved label map
    """

    # determine the path of where to save the label map
    label_proto_path = os.path.join(output_dir, 'label_map.pbtxt')

    # open the file
    with open(label_proto_path, 'w') as f:
        # create an entry for each label
        for i in range(len(labels)):
            f.write(create_label_str(i + 1, labels[i]))

    logging.info(f'Created {full_path(label_proto_path)}')

    return label_proto_path


def create_label_str(id, name):
    """
    Create the label map entry for a given label ID and name.

    :param id: the id of the label
    :param name: the label name
    :return: the formatted entry to go in label_map.pbtxt
    """

    return f"\nitem {{\n    id: {id}\n    name: '{name}'\n}}\n"
