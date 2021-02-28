__author__ = 'Ian Randman'

import logging
import sys

import tensorflow as tf
from google.protobuf import text_format
from object_detection.protos import pipeline_pb2

logger = logging.getLogger(__name__)


def edit_pipeline_config(pretrained_model_dir, output_dir, num_classes, annotations_dir):
    pipeline_config_path = pretrained_model_dir + '/pipeline.config'
    pipeline_config = pipeline_pb2.TrainEvalPipelineConfig()

    with tf.io.gfile.GFile(pipeline_config_path, 'r') as f:
        proto_str = f.read()
        text_format.Merge(proto_str, pipeline_config)

    model_names = list(pipeline_config.model.DESCRIPTOR.fields_by_name)
    found_model = False
    for model_name in model_names:
        model_obj = getattr(pipeline_config.model, model_name)
        if model_obj.ByteSize() > 0:  # found the actual model in the config
            model_obj.num_classes = num_classes
            found_model = True
            break

    if not found_model:
        logger.error('Cannot find specific model in pipeline.config')
        sys.exit(1)

    pipeline_config.train_config.batch_size = 8 # TODO change?
    pipeline_config.train_config.fine_tune_checkpoint = pretrained_model_dir + '/checkpoint/ckpt-0'

    # Set this to "detection" since we want to be training the full detection model
    pipeline_config.train_config.fine_tune_checkpoint_type = 'detection'  # TODO what do other options mean

    pipeline_config.train_input_reader.label_map_path = annotations_dir + '/label_map.pbtxt'
    pipeline_config.train_input_reader.tf_record_input_reader.input_path[:] = [annotations_dir + '/train.record']

    pipeline_config.eval_input_reader[0].label_map_path = annotations_dir + '/label_map.pbtxt'
    pipeline_config.eval_input_reader[0].tf_record_input_reader.input_path[:] = [annotations_dir + '/test.record']

    config_text = text_format.MessageToString(pipeline_config)
    output_path = output_dir + '/pipeline.config'
    with tf.io.gfile.GFile(output_path, "wb") as f:
        f.write(config_text)

    logger.info(f'Created {output_path}')

    return output_path
