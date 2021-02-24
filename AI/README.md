# Machine Learning Documentation for OURepository

## Preliminary steps for training:

1. Run `python crop.py` to generate image slices and convert to TFRecords.
1. Run `python model_main_tf2.py --checkpoint_every_n=100` to start the 
   training process.
1. From within the AI directory, run `tensorboard --logdir=models/test/faster_rcnn_resnet50_v1_640x640_coco17_tpu-8` to view training 
   statistics. Training can be stopped when loss reaches an asymptote.
1. Run `python exporter_main_v2.py --input_type image_tensor --pipeline_config_path 
   models/test/faster_rcnn_resnet50_v1_640x640_coco17_tpu-8/pipeline.config --trained_checkpoint_dir 
   models/test/faster_rcnn_resnet50_v1_640x640_coco17_tpu-8 
   --output_directory exported-models/test/my_faster_rcnn_resnet50_v1` to export the model.
1. Evaluation can be performed using either a Tensorflow SavedModel or a Checkpoint. We will use SavedModel. Run 
   `python inference.py`.