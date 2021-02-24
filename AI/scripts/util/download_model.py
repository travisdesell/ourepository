"""
Download and unpack a Tensorflow Object Detection Model.
The model zoo can be found at:
https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/tf2_detection_zoo.md
"""

__author__ = 'Ian Randman'

import logging
import os
from tqdm import tqdm
import requests
import shutil
import sys

logger = logging.getLogger(__name__)

# pretrained models
PRETRAINED_MODELS_DIR = os.path.join(os.path.dirname(__file__), '../../pre-trained-models')
if not os.path.exists(PRETRAINED_MODELS_DIR):
    os.mkdir(PRETRAINED_MODELS_DIR)
    logger.info(f'Created {PRETRAINED_MODELS_DIR}')

# pretrained model archives
MODEL_ARCHIVE_DIR = os.path.join(PRETRAINED_MODELS_DIR, 'archives')
if not os.path.exists(MODEL_ARCHIVE_DIR):
    os.mkdir(MODEL_ARCHIVE_DIR)
    logger.info(f'Created {MODEL_ARCHIVE_DIR}')


def download_and_unpack_model(model_name, model_date='20200711'):
    base_url = 'http://download.tensorflow.org/models/object_detection/tf2/'
    model_file = model_name + '.tar.gz'
    model_archive_path = os.path.join(MODEL_ARCHIVE_DIR, model_file)
    retry = False

    # if the tar.gz exists, unpack it
    if os.path.exists(model_archive_path):
        logger.info(f'Attempting to unpack {model_archive_path}...')
        try:
            shutil.unpack_archive(model_archive_path, os.path.dirname(MODEL_ARCHIVE_DIR))
        except EOFError:
            logger.info('Cannot unpack. Archive is corrupt. Attempting to retry...')
            retry = True

    # if the tar.gz does not exist or is corrupt, download it, then unpack it
    if not os.path.exists(model_archive_path) or retry:
        url = base_url + model_date + '/' + model_file
        logger.info(f'Downloading from {url}...')

        # download file as stream
        response = requests.get(url, stream=True)
        with open(model_archive_path, 'wb') as handle:
            progress_bar = tqdm(unit="B", total=int(response.headers['Content-Length']), unit_scale=True, unit_divisor=1024)
            for data in response.iter_content(chunk_size=8192):
                progress_bar.update(len(data))
                handle.write(data)
            progress_bar.close()

        # unpack tar.gz
        logger.info(f'Attempting to unpack {model_archive_path}...')
        try:
            shutil.unpack_archive(model_archive_path, os.path.dirname(MODEL_ARCHIVE_DIR))
        except EOFError:
            logger.info('Archive cannot be unpacked')
            sys.exit(1)

    logger.info('Successfully downloaded and unpacked model')
