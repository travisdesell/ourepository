# Lint as: python3
# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

r"""Creates and runs TF2 object detection models.

For local training/evaluation run:
PIPELINE_CONFIG_PATH=path/to/pipeline.config
MODEL_DIR=/tmp/model_outputs
NUM_TRAIN_STEPS=10000
SAMPLE_1_OF_N_EVAL_EXAMPLES=1
python model_main_tf2.py -- \
  --model_dir=$MODEL_DIR --num_train_steps=$NUM_TRAIN_STEPS \
  --sample_1_of_n_eval_examples=$SAMPLE_1_OF_N_EVAL_EXAMPLES \
  --pipeline_config_path=$PIPELINE_CONFIG_PATH \
  --alsologtostderr
"""
import os
import shutil
import sys

from absl import flags
import tensorflow.compat.v2 as tf
from object_detection import model_lib_v2

import logging

from scripts.util.download_model import download_and_unpack_model
from scripts.util.edit_pipeline_config import edit_pipeline_config

# TODO change TF logging. Do not know how to make it use this logger. May have to configure separately.
logger = logging.getLogger(__name__)

flags.DEFINE_string('pipeline_config_path', None, 'Path to pipeline config '
                                                  'file.')
flags.DEFINE_integer('num_train_steps', None, 'Number of train steps.')
flags.DEFINE_bool('eval_on_train_data', False, 'Enable evaluating on train '
                                               'data (only supported in distributed training).')
flags.DEFINE_integer('sample_1_of_n_eval_examples', None, 'Will sample one of '
                                                          'every n eval input examples, where n is provided.')
flags.DEFINE_integer('sample_1_of_n_eval_on_train_examples', 5, 'Will sample '
                                                                'one of every n train input examples for evaluation, '
                                                                'where n is provided. This is only used if '
                                                                '`eval_training_data` is True.')
flags.DEFINE_string(
    'model_dir', None, 'Path to output model directory '
                       'where event and checkpoint files will be written.')
flags.DEFINE_string(
    'checkpoint_dir', None, 'Path to directory holding a checkpoint.  If '
                            '`checkpoint_dir` is provided, this binary operates in eval-only mode, '
                            'writing resulting metrics to `model_dir`.')

flags.DEFINE_integer('eval_timeout', 3600, 'Number of seconds to wait for an'
                                           'evaluation checkpoint before exiting.')

flags.DEFINE_bool('use_tpu', False, 'Whether the job is executing on a TPU.')
flags.DEFINE_string(
    'tpu_name',
    default=None,
    help='Name of the Cloud TPU for Cluster Resolvers.')
flags.DEFINE_integer(
    'num_workers', 1, 'When num_workers > 1, training uses '
                      'MultiWorkerMirroredStrategy. When num_workers = 1 it uses '
                      'MirroredStrategy.')
flags.DEFINE_integer(
    'checkpoint_every_n', 1000, 'Integer defining how often we checkpoint.')
flags.DEFINE_boolean('record_summaries', True,
                     ('Whether or not to record summaries during'
                      ' training.'))

# NEW FLAGS

flags.DEFINE_string(
    'name',
    help='a name that uniquely identifies this mosaic and training data',
    default='test'
)  # TODO must be changed to account for user/project
flags.DEFINE_string(
    'data_dir',
    help='directory containing mosaic and CSVs to train on',
    default=os.path.join(os.path.dirname(__file__), '../test/test')
)
flags.DEFINE_string(
    'model_name',
    help='the name of the pretrained model from the TF Object Detection model zoo',
    default='faster_rcnn_resnet50_v1_640x640_coco17_tpu-8'
)  # TODO maybe add option for year
flags.DEFINE_boolean(
    'continue_from_checkpoint',
    help='whether training should continue from a checkpoint',
    default=False
)

FLAGS = flags.FLAGS


def main(unused_argv):
    # TODO what flags should be required?
    # TODO how to handle checkpoint

    # pretrained model from Tensorflow Object Detection model zoo
    pretrained_model_dir = os.path.join(os.path.join(os.path.dirname(__file__), '../pre-trained-models/'),
                                        FLAGS.model_name)
    if not os.path.exists(pretrained_model_dir):
        download_and_unpack_model(FLAGS.model_name)

    # user models
    user_models_dir = os.path.join(os.path.dirname(__file__), '../models')
    if not os.path.exists(user_models_dir):
        os.mkdir(user_models_dir)
        logger.info(f'Created {user_models_dir}')

    # path to directory containing user-trained models for this mosaic
    mosaic_models_dir = os.path.join(user_models_dir, FLAGS.name)
    if not os.path.exists(mosaic_models_dir):
        os.mkdir(mosaic_models_dir)
        logger.info(f'Created {mosaic_models_dir}')

    # path to directory containing the specific user-trained model for this mosaic
    mosaic_model_dir = os.path.join(mosaic_models_dir, FLAGS.model_name)
    if os.path.exists(mosaic_model_dir):
        if FLAGS.continue_from_checkpoint:
            logger.error(f'Cannot find {mosaic_model_dir}')
            sys.exit(1)
        else:
            shutil.rmtree(mosaic_model_dir)

    os.mkdir(mosaic_model_dir)
    logger.info(f'Created {mosaic_model_dir}')

    mosaic_annotations_dir = os.path.join(os.path.dirname(__file__), '../annotations/' + FLAGS.name)
    num_classes = len([f for f in os.listdir(FLAGS.data_dir) if f.lower().endswith('.csv')])
    pipeline_config_path = edit_pipeline_config(pretrained_model_dir, mosaic_model_dir, num_classes, mosaic_annotations_dir)
    logger.info(f'Created {pipeline_config_path}')


    # flags.mark_flag_as_required('model_dir')
    # flags.mark_flag_as_required('pipeline_config_path')
    tf.config.set_soft_device_placement(True)

    if FLAGS.checkpoint_dir:
        model_lib_v2.eval_continuously(
            pipeline_config_path=FLAGS.pipeline_config_path,
            model_dir=mosaic_model_dir,
            train_steps=FLAGS.num_train_steps,
            sample_1_of_n_eval_examples=FLAGS.sample_1_of_n_eval_examples,
            sample_1_of_n_eval_on_train_examples=(
                FLAGS.sample_1_of_n_eval_on_train_examples),
            checkpoint_dir=FLAGS.checkpoint_dir,
            wait_interval=300, timeout=FLAGS.eval_timeout)
    else:
        if FLAGS.use_tpu:
            # TPU is automatically inferred if tpu_name is None and
            # we are running under cloud ai-platform.
            resolver = tf.distribute.cluster_resolver.TPUClusterResolver(
                FLAGS.tpu_name)
            tf.config.experimental_connect_to_cluster(resolver)
            tf.tpu.experimental.initialize_tpu_system(resolver)
            strategy = tf.distribute.experimental.TPUStrategy(resolver)
        elif FLAGS.num_workers > 1:
            strategy = tf.distribute.experimental.MultiWorkerMirroredStrategy()
        else:
            strategy = tf.compat.v2.distribute.MirroredStrategy()


        with strategy.scope():
            model_lib_v2.train_loop(
                pipeline_config_path=pipeline_config_path,
                model_dir=mosaic_model_dir,
                train_steps=FLAGS.num_train_steps,
                use_tpu=FLAGS.use_tpu,
                checkpoint_every_n=FLAGS.checkpoint_every_n,
                record_summaries=FLAGS.record_summaries)


if __name__ == '__main__':
    tf.compat.v1.app.run()
