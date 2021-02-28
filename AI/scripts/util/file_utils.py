__author__ = 'Ian Randman'

import logging
import os
import sys

logger = logging.getLogger(__name__)


def create_directory_if_not_exists(dir_name):
    if not os.path.exists(dir_name):
        os.mkdir(dir_name)
        logger.info(f'Created {dir_name}')


def get_labels_from_csvs(csv_filenames):
    csv_filename_to_label = dict()
    for csv_filename in csv_filenames:
        with open(csv_filename) as f:
            label = ''
            line = f.readline()
            while line and line.startswith('#'):
                if line.lower().startswith('#label:'):
                    label = line.split(':')[-1].strip()
                    break
                line = f.readline()
            if label == '':
                logger.error(f'Cannot find label comment in {csv_filename}')
                sys.exit(1)
            csv_filename_to_label[csv_filename] = label

    return csv_filename_to_label