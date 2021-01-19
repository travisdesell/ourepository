# Machine Learning Documentation for OURepository

## Preliminary steps for training:

1. Run `python crop.py` to generate image slices.
1. Run `python partition_dataset.py` to move the images into train and test directories.
1. Run `python edit_xml.py` to correct filepath-related tags in the XMLs. This step may not be needed or is possible 
   to simplify.
1. Run `python generate_tfrecord.py` to generate the TFRecords for the training and test datasets.
1. Run `python model_main_tf2.py --model_dir=models/my_faster_rcnn_resnet50_v1 
   --pipeline_config_path=models/my_faster_rcnn_resnet50_v1/pipeline.config --checkpoint_every_n=100` to start the 
   training process.
1. Run `tensorboard --logdir=models/my_faster_rcnn_resnet50_v1` to view training statistics. Training can be stopped 
   when loss reaches an asymptote.
1. Run `python exporter_main_v2.py --input_type image_tensor --pipeline_config_path 
   models/my_faster_rcnn_resnet50_v1/pipeline.config --trained_checkpoint_dir models/my_faster_rcnn_resnet50_v1 
   --output_directory exported-models/my_faster_rcnn_resnet50_v1` to export the model.
1. Evaluation can be performed using either a Tensorflow SavedModel or a Checkpoint. We will use SavedModel. Run 
   `python inference.py`.