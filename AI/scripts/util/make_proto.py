"""
From a list of labels, generate the label protbuf to be used in a Tensorflow Object Detection model.
"""

__author__ = 'David Dunlap, Ian Randman'

import logging
import os

logger = logging.getLogger(__name__)


def create_label_proto(labels, output_dir='.'):
    label_proto_path = os.path.join(output_dir, 'label_map.pbtxt')
    with open(label_proto_path, 'w') as f:
        for i in range(len(labels)):
            f.write(create_label_str(i + 1, labels[i]))

    logging.info(f'Created {label_proto_path}')

    return label_proto_path


def create_label_str(id, name):
    return f"\nitem {{\n    id: {id}\n    name: '{name}'\n}}\n"


if __name__ == '__main__':
    create_label_proto(['butterfly'])