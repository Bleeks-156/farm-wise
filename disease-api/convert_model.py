"""Convert .h5 model to TFLite — handles TF version mismatches."""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
import numpy as np

h5_path  = r'D:\The Last Of Us\Compressed\archive(1)\Plant Diseases Classification Models\Plant Diseases Classification Models\plant disease_99.80.h5'
out_path = r'C:\Users\USER\Downloads\farm-wise\disease-api\plant_disease.tflite'

print(f'TensorFlow version: {tf.__version__}')
print('Loading model...')

# TF 2.20 can't load models saved with old format directly
# Use legacy loading
try:
    model = tf.keras.models.load_model(h5_path, compile=False)
except Exception:
    print('Direct load failed, trying with custom_objects workaround...')
    import h5py
    # Load weights into a fresh model by inspecting the file
    with h5py.File(h5_path, 'r') as f:
        if 'model_config' in f.attrs:
            config = f.attrs['model_config']
            if isinstance(config, bytes):
                config = config.decode('utf-8')
    
    # Try loading with safe_mode off (TF >= 2.17)
    try:
        model = tf.keras.models.load_model(h5_path, compile=False, safe_mode=False)
    except Exception:
        # Last resort: use tf.compat
        model = tf.compat.v1.keras.models.load_model(h5_path, compile=False)

print(f'Model loaded! Input shape: {model.input_shape}')

# Test prediction
dummy = np.zeros((1,) + model.input_shape[1:], dtype=np.float32)
out = model.predict(dummy, verbose=0)
print(f'Test prediction output shape: {out.shape}')

# Convert
print('Converting to TFLite...')
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_bytes = converter.convert()

with open(out_path, 'wb') as f:
    f.write(tflite_bytes)

size_mb = os.path.getsize(out_path) / 1e6
print(f'SUCCESS! Saved: {out_path} ({size_mb:.1f} MB)')
