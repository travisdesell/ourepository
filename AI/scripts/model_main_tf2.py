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

"""
TODO Flags must be adjusted a bit for which are required

       USAGE: model_main_tf2.py [flags]
flags:

model_main_tf2.py:
  --checkpoint_dir: Path to directory holding a checkpoint.  If `checkpoint_dir`
    is provided, this binary operates in eval-only mode, writing resulting
    metrics to `model_dir`.
  --checkpoint_every_n: Integer defining how often we checkpoint.
    (default: '50')
    (an integer)
  --[no]continue_from_checkpoint: whether training should continue from a
    checkpoint
    (default: 'false')
  --data_dir: directory containing directories containing mosaic and CSVs to
    train on
    (default: 'C:/Users/Ian/Documents/College/Fourth Year/Fall Semester/Software
    Engineering Project/ourepository/AI/scripts\\../test/test')
  --[no]eval_on_train_data: Enable evaluating on train data (only supported in
    distributed training).
    (default: 'false')
  --eval_timeout: Number of seconds to wait for anevaluation checkpoint before
    exiting.
    (default: '3600')
    (an integer)
  --model_dir: Path to output model directory where event and checkpoint files
    will be written.
  --model_name: the name of the pretrained model from the TF Object Detection
    model zoo
    (default: 'faster_rcnn_resnet50_v1_640x640_coco17_tpu-8')
  --model_uuid: the UUID of the model to run
    (default: 'test')
  --num_train_steps: Number of train steps.
    (an integer)
  --num_workers: When num_workers > 1, training uses
    MultiWorkerMirroredStrategy. When num_workers = 1 it uses MirroredStrategy.
    (default: '1')
    (an integer)
  --pipeline_config_path: Path to pipeline config file.
  --[no]record_summaries: Whether or not to record summaries during training.
    (default: 'true')
  --sample_1_of_n_eval_examples: Will sample one of every n eval input examples,
    where n is provided.
    (an integer)
  --sample_1_of_n_eval_on_train_examples: Will sample one of every n train input
    examples for evaluation, where n is provided. This is only used if
    `eval_training_data` is True.
    (default: '5')
    (an integer)
  --tpu_name: Name of the Cloud TPU for Cluster Resolvers.
  --[no]use_tpu: Whether the job is executing on a TPU.
    (default: 'false')
"""

import logging
import os
import shutil
import sys


os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress TensorFlow logging

from absl import flags
import tensorflow as tf
from object_detection import model_lib_v2
from object_detection.utils import label_map_util

from scripts.util.download_model import download_and_unpack_model
from scripts.util.edit_pipeline_config import edit_pipeline_config
from scripts.util.file_utils import create_directory_if_not_exists, full_path
from scripts.util.analyze_checkpoint import tfevent_final_loss

from scripts import ROOT_DIR

logger = logging.getLogger(__name__)

physical_devices = tf.config.list_physical_devices('GPU')
tf.config.experimental.set_memory_growth(physical_devices[0], True)
# os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

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
    'checkpoint_every_n', 50, 'Integer defining how often we checkpoint.')
flags.DEFINE_boolean('record_summaries', True,
                     ('Whether or not to record summaries during'
                      ' training.'))

# NEW FLAGS

flags.DEFINE_string(
    'model_uuid',
    help='the UUID of the model to run',
    default='test'
)
flags.DEFINE_string(
    'data_dir',
    help='directory containing directories containing mosaic and CSVs to train on',
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


def train_model(pipeline_config_path, model_dir, steps_per_run):
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

    logger.info(f'Model training has started...')
    with strategy.scope():
        model_lib_v2.train_loop(
            pipeline_config_path=pipeline_config_path,
            model_dir=model_dir,
            train_steps=FLAGS.num_train_steps,
            use_tpu=FLAGS.use_tpu,
            checkpoint_every_n=steps_per_run-1,
            record_summaries=FLAGS.record_summaries,
            num_steps_per_iteration=1,  # TODO if using TPU this maybe should be changed
            checkpoint_max_to_keep=3)
    logger.info(f'Model training completed')


def eval_model(pipeline_config_path, model_dir):
    logger.info(f'Model evaluation has started...')
    model_lib_v2.eval_continuously(
        pipeline_config_path=pipeline_config_path,
        model_dir=model_dir,
        train_steps=FLAGS.num_train_steps,
        sample_1_of_n_eval_examples=FLAGS.sample_1_of_n_eval_examples,
        sample_1_of_n_eval_on_train_examples=(
            FLAGS.sample_1_of_n_eval_on_train_examples),
        checkpoint_dir=model_dir,
        wait_interval=1, timeout=1)


def train_and_eval(last_results, pipeline_config_path, model_dir, steps_per_run):
    # train for n steps
    train_model(pipeline_config_path, model_dir, steps_per_run)

    # take note of final training loss
    train_loss = tfevent_final_loss(model_dir)

    # eval on saved model
    eval_model(pipeline_config_path, model_dir)

    # find loss from evaluation
    eval_loss = tfevent_final_loss(model_dir, type='eval')
    shutil.rmtree(os.path.join(model_dir, 'eval'))  # Delete eval directory so it will be fresh on the next run

    # take note when the test loss goes up while the train loss goes down. This could indicate over-fitting
    went_up = (eval_loss > last_results['eval_loss']) and (train_loss < last_results['train_loss'])

    # if the test loss went up this time and last time, we can be certain that we are over-fitting so we should stop
    should_stop = went_up and last_results['went_up']

    results = {'train_loss': train_loss, 'eval_loss': eval_loss, 'went_up': went_up, 'should_stop': should_stop}
    logger.debug(f"Finished training epoch. Train loss: {train_loss}, Eval loss: {eval_loss}, went up: {went_up}")
    return results


def main(unused_argv):

    # edit pipeline configs - if resuming from checkpoint add already trained steps to steps to train ?? maybe
    # look at tfevents to get already trained steps
    #
    #
    #
    #
    # starting new vs resuming training
    #
    #
    #
    #
    # model_main_tf2 202 run with evaluation
    #
    #
    # checkpoint_every_n
    #
    # mosaic_annotations_dir
    # 	annotations/test/test.record OR train.record
    #
    # how to eval on test set? Does it do it automatically?
    #
    #
    # how do we stop? Is it when the test set loss passes some threshold or is it when the losses start to diverge?

    # train for 5, if it went up train for 5 more, if it went up stop and use the checkpoint from before it went up

    #

    # TODO remove all saved checkpoints other than the one from two loops ago

    # check 1 went down
    # check 2 went up
    # check 3 went up
    # STOP. See that we are on 3, get check 3-2=1



    # pretrained model from TensorFlow Object Detection model zoo
    pretrained_model_dir = os.path.join(ROOT_DIR, 'pre-trained-models', FLAGS.model_name)
    if not os.path.exists(pretrained_model_dir):
        download_and_unpack_model(FLAGS.model_name)

    # user models
    user_models_dir = os.path.join(ROOT_DIR, 'models')
    create_directory_if_not_exists(user_models_dir)

    # path to directory containing the specific user-trained model
    model_dir = os.path.join(user_models_dir, FLAGS.model_uuid)
    # check whether model directory exists and whether to continue from checkpoint
    if os.path.exists(model_dir):
        if FLAGS.continue_from_checkpoint:
            logger.info(f'Continuing from checkpoint at {full_path(model_dir)}')
        else:
            # if not continuing from checkpoint, raise error
            logger.error(f'Checkpoint file exists at {full_path(model_dir)} but continue_from_checkpoint is false')
            sys.exit(1)
    else:
        if FLAGS.continue_from_checkpoint:
            logger.error(f'Cannot find checkpoint at {full_path(model_dir)}')
            sys.exit(1)

    # create the user-trained model directory
    create_directory_if_not_exists(model_dir)

    # path to directory containing the annotations for this user-trained model
    model_annotations_dir = os.path.join(ROOT_DIR, 'annotations/' + FLAGS.model_uuid)

    # get the number of classes to train on
    label_map_path = os.path.join(model_annotations_dir, 'label_map.pbtxt')
    num_classes = len(label_map_util.load_labelmap(label_map_path).item)

    results = {'train_loss': 100000, 'eval_loss': 100000, 'went_up': False, 'should_stop': False}
    steps_per_run = 50
    num_steps = 0
    while not results['should_stop']:
        num_steps += steps_per_run

        # make the pipeline configuration
        pipeline_config_path = edit_pipeline_config(pretrained_model_dir, model_dir, num_classes, model_annotations_dir,
                                                    num_steps)

        # TODO what flags should be required
        # flags.mark_flag_as_required('model_dir')
        # flags.mark_flag_as_required('pipeline_config_path')
        tf.config.set_soft_device_placement(True)

        results = train_and_eval(results, pipeline_config_path, model_dir, steps_per_run)
        # results['should_stop'] = True  # TODO just for debugging


if __name__ == '__main__':
    tf.compat.v1.app.run()
