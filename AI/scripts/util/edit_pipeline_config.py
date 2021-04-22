"""
Take a pipeline.config from a pre-trained model and configure it to train on a mosaic.
This involves (possibly) changing the number of classes and pointing to configuration to the correct paths for the
training and testing TFRecords and the label map.
"""

__author__ = 'Ian Randman'

import logging
import os
import sys

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

import tensorflow as tf
from google.protobuf import text_format
from object_detection.protos import pipeline_pb2

from scripts.util.file_utils import full_path

logger = logging.getLogger(__name__)


def load_config(pipeline_config_path):
    """
    Load a pipeline.config.

    :param pipeline_config_path: the path to the pipeline.config
    :return: the config object
    """

    pipeline_config = pipeline_pb2.TrainEvalPipelineConfig()
    with tf.io.gfile.GFile(pipeline_config_path, 'r') as f:
        proto_str = f.read()
        text_format.Merge(proto_str, pipeline_config)

    return pipeline_config


def edit_pipeline_config(pretrained_model_dir, output_dir, num_classes, annotations_dir):
    """
    Edit a pipeline configuration model to work with training on a specific set of training data.
    This changes the number of classes, the batch size, the path to the pre-trained model checkpoint, the type of
    training, the label map path for the train and evaluation input readers, and the TFRecord paths for the train and
    evaluation input readers.

    :param pretrained_model_dir: the directory containing the pre-trained model from the model zoo
    :param output_dir: the directory for the model that the configuration is for
    :param num_classes: the number of labels that training will occur on
    :param annotations_dir: the directory containing the train/test data and the label map
    :return: the path to the new pipeline.config
    """

    # determine the path to the pipeline.config of the pre-trained model
    pipeline_config_path = os.path.join(pretrained_model_dir, 'pipeline.config')

    # load the configuration
    pipeline_config = load_config(pipeline_config_path)

    # The configuration object has fields for each of the possible models. We need to edit the model that is in the
    # pre-trained model pipeline.config.
    model_names = list(pipeline_config.model.DESCRIPTOR.fields_by_name)
    found_model = False
    for model_name in model_names:
        model_obj = getattr(pipeline_config.model, model_name)
        if model_obj.ByteSize() > 0:  # found the actual model in the config
            model_obj.num_classes = num_classes
            found_model = True
            break

    # exit if the model from the pre-trained model pipeline.config cannot be found in the config object
    if not found_model:
        logger.error('Cannot find specific model in pipeline.config')
        sys.exit(1)

    # set the batch size
    pipeline_config.train_config.batch_size = 8  # TODO change? Affects memory usage

    # Set the path to the checkpoint from the pre-trained model. This does not have to be changed for continuing
    # training from a checkpoint. TensorFlow will figure out the most recent checkpoint automatically.
    pipeline_config.train_config.fine_tune_checkpoint = pretrained_model_dir + '/checkpoint/ckpt-0'

    # set this to "detection" since we want to be training the full detection model
    pipeline_config.train_config.fine_tune_checkpoint_type = 'detection'  # TODO what do other options mean

    # set the path to the label map for the train input reader
    pipeline_config.train_input_reader.label_map_path = annotations_dir + '/label_map.pbtxt'
    # set the path to the train TFRecord for the train input reader
    pipeline_config.train_input_reader.tf_record_input_reader.input_path[:] = [annotations_dir + '/train.record']

    # set the path to the label map for the evaluation input reader
    pipeline_config.eval_input_reader[0].label_map_path = annotations_dir + '/label_map.pbtxt'
    # set the path to the train TFRecord for the evaluation input reader
    pipeline_config.eval_input_reader[0].tf_record_input_reader.input_path[:] = [annotations_dir + '/test.record']

    # save the new pipeline.config
    config_text = text_format.MessageToString(pipeline_config)
    output_path = os.path.join(output_dir, 'pipeline.config')
    with tf.io.gfile.GFile(output_path, "wb") as f:
        f.write(config_text)

    logger.info(f'Created {full_path(output_path)}')

    # return the path to the new pipeline.config
    return output_path
