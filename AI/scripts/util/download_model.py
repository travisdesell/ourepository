"""
Download and unpack a TensorFlow Object Detection model.
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

from scripts.util.file_utils import create_directory_if_not_exists, full_path

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)


def download_and_unpack_model(model_name, model_date='20200711'):
    """
    Download a model (tar.gz) from the TensorFlow Object Detection Model Zoo if it not yet downloaded.
    Unpack the model archive. If unpacking fails, try re-downloading the model first.

    :param model_name: the name of the model to download
    :param model_date: the date of the model to download
    :return: none
    """

    # pretrained models
    pretrained_models_dir = os.path.join(ROOT_DIR, 'pre-trained-models')
    create_directory_if_not_exists(pretrained_models_dir)

    # pretrained model archives
    model_archive_dir = os.path.join(pretrained_models_dir, 'archives')
    create_directory_if_not_exists(model_archive_dir)

    # determine the (expected) path of the downloaded model
    model_file = f'{model_name}.tar.gz'
    model_archive_path = os.path.join(model_archive_dir, model_file)

    # if the tar.gz exists, try to unpack it
    retry = False
    if os.path.exists(model_archive_path):
        logger.info(f'Attempting to unpack {full_path(model_archive_path)}...')
        try:
            shutil.unpack_archive(model_archive_path, os.path.dirname(model_archive_dir))
        except EOFError:
            logger.info('Cannot unpack. Archive is corrupt. Attempting to retry...')
            retry = True

    # if the tar.gz does not exist or is corrupt (unpacking failed), download it, then unpack it
    if not os.path.exists(model_archive_path) or retry:
        base_url = 'http://download.tensorflow.org/models/object_detection/tf2/'
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

        # try to  unpack tar.gz
        logger.info(f'Attempting to unpack {full_path(model_archive_path)}...')
        try:
            shutil.unpack_archive(model_archive_path, os.path.dirname(model_archive_dir))
        except EOFError:
            # give up if unpacking failed
            logger.info('Archive cannot be unpacked')
            sys.exit(1)

    logger.info('Successfully downloaded and unpacked model')
