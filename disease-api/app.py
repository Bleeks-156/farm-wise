"""
FarmWise – Plant Disease Detection API
Uses TFLite for fast inference on low-CPU servers (Render free tier).
Converts .h5 → .tflite on first boot, then uses lightweight interpreter.
"""

import ast
import io
import json
import os
from pathlib import Path

import gdown
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageEnhance

# ── Paths ─────────────────────────────────────────────────────────────────────
ASSETS_DIR    = Path("assets")
MODEL_PATH    = ASSETS_DIR / "plant_disease.h5"
TFLITE_PATH   = ASSETS_DIR / "plant_disease.tflite"
CLASSES_PATH  = ASSETS_DIR / "list_of_classes.txt"
CURE_PATH     = ASSETS_DIR / "cure.json"

# ── Google Drive File IDs ─────────────────────────────────────────────────────
MODEL_FILE_ID   = "1lxKcXZND6ezM1h5byVwrbXHcy7y6W7fs"
CLASSES_FILE_ID = "1T6wpzmwec63DCvjXvVsrv6T3EI4TUMIe"
CURE_FILE_ID    = "1zTP-BZ4cObwzsX0Xmh_hwkvUcTzF2HGa"

CONF_THRESHOLD = 0.70

# ── Crop hint groups ──────────────────────────────────────────────────────────
CROP_GROUPS = {
    "rice":       ["Bacterial leaf blight in rice leaf", "Brown spot in rice leaf",
                   "Leaf smut in rice leaf", "Sogatella rice"],
    "corn":       ["Blight in corn Leaf", "Common Rust in corn Leaf",
                   "Corn (maize) healthy", "Gray Leaf Spot in corn Leaf", "corn crop"],
    "citrus":     ["Orange Haunglongbing Citrus greening", "lemon canker"],
    "apple":      ["Apple Apple scab", "Apple Black rot",
                   "Apple Cedar apple rust", "Apple healthy"],
    "tomato":     ["Tomato Bacterial spot", "Tomato Early blight", "Tomato Late blight",
                   "Tomato Leaf Mold", "Tomato Septoria leaf spot",
                   "Tomato Spider mites Two spotted spider mite", "Tomato Target Spot",
                   "Tomato Tomato mosaic virus", "Tomato healthy", "tomato canker"],
    "grape":      ["Grape Black rot", "Grape Esca Black Measles",
                   "Grape Leaf blight Isariopsis Leaf Spot", "Grape healthy"],
    "potato":     ["Potato Early blight", "Potato Late blight",
                   "Potato healthy", "potato crop", "potato hollow heart"],
    "cherry":     ["Cherry (including sour) Powdery mildew", "Cherry (including_sour) healthy"],
    "pepper":     ["Pepper bell Bacterial spot", "Pepper bell healthy"],
    "strawberry": ["Strawberry Leaf scorch", "Strawberry healthy"],
    "tea":        ["algal leaf in tea", "anthracnose in tea", "bird eye spot in tea",
                   "brown blight in tea", "healthy tea leaf", "red leaf spot in tea"],
    "blueberry":  ["Blueberry healthy"],
    "peach":      ["Peach healthy"],
    "raspberry":  ["Raspberry healthy"],
    "soybean":    ["Soybean healthy"],
    "other":      ["Garlic", "ginger", "onion", "Cercospora leaf spot",
                   "cabbage looper", "Nitrogen deficiency in plant",
                   "Waterlogging in plant", "potassium deficiency in plant"],
}


# ── Download assets from Google Drive ─────────────────────────────────────────
def download_assets():
    ASSETS_DIR.mkdir(exist_ok=True)
    files = [
        (MODEL_PATH,   MODEL_FILE_ID,   "plant_disease.h5 (129 MB)"),
        (CLASSES_PATH, CLASSES_FILE_ID, "list_of_classes.txt"),
        (CURE_PATH,    CURE_FILE_ID,    "cure.json"),
    ]
    for local_path, file_id, name in files:
        if local_path.exists():
            print(f"[assets] {name} — cached, skipping.")
        else:
            print(f"[assets] Downloading {name} …")
            gdown.download(
                f"https://drive.google.com/uc?id={file_id}",
                str(local_path), quiet=False, fuzzy=True
            )
            print(f"[assets] Done: {name}")


download_assets()


# ── Convert .h5 → .tflite (once, then cached) ────────────────────────────────
def convert_to_tflite():
    if TFLITE_PATH.exists():
        print("[model] TFLite model already cached.")
        return

    print("[model] Converting .h5 → .tflite (one-time, ~30s) …")
    import tensorflow as tf
    model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    TFLITE_PATH.write_bytes(tflite_model)
    print(f"[model] TFLite saved: {TFLITE_PATH.stat().st_size / 1e6:.1f} MB")


convert_to_tflite()


# ── Load TFLite interpreter (lightweight, fast) ──────────────────────────────
print("[model] Loading TFLite interpreter…")
import tensorflow as tf
interpreter = tf.lite.Interpreter(model_path=str(TFLITE_PATH))
interpreter.allocate_tensors()

input_details  = interpreter.get_input_details()
output_details = interpreter.get_output_details()

MODEL_H = input_details[0]['shape'][1]
MODEL_W = input_details[0]['shape'][2]
print(f"[model] TFLite ready. Input: {MODEL_H}x{MODEL_W}")

with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    class_labels = ast.literal_eval(f.read())

with open(CURE_PATH, "r", encoding="utf-8") as f:
    cure_db = {" ".join(k.strip().lower().split()): v for k, v in json.load(f).items()}

print(f"[model] {len(class_labels)} disease classes loaded.")


# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


def preprocess(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    mw, mh = int(w * 0.10), int(h * 0.10)
    img = img.crop((mw, mh, w - mw, h - mh))
    img = ImageEnhance.Contrast(img).enhance(1.3)
    img = ImageEnhance.Sharpness(img).enhance(1.3)
    img = img.resize((MODEL_W, MODEL_H), Image.LANCZOS)
    return np.expand_dims(np.asarray(img, dtype=np.float32), axis=0)


def run_inference(x):
    """TFLite inference — 5-10x faster than model.predict() on low CPU."""
    interpreter.set_tensor(input_details[0]['index'], x)
    interpreter.invoke()
    return interpreter.get_tensor(output_details[0]['index'])[0].copy()


@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status":      "ok",
        "service":     "FarmWise Plant Disease API (TFLite)",
        "classes":     len(class_labels),
        "input_shape": f"{MODEL_H}x{MODEL_W}",
    })


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 200

    if "image" not in request.files:
        return jsonify({"error": "Send a multipart/form-data POST with key 'image'."}), 400

    crop_hint = request.form.get("crop", "").strip().lower() or None
    topk      = max(1, min(int(request.form.get("topk", 3)), len(class_labels)))

    try:
        x = preprocess(request.files["image"].read())
    except Exception as e:
        return jsonify({"error": f"Image processing failed: {e}"}), 422

    probs        = run_inference(x)
    hint_applied = False

    if crop_hint and crop_hint in CROP_GROUPS:
        allowed      = set(CROP_GROUPS[crop_hint])
        mask         = np.array([1.0 if lbl in allowed else 0.0
                                 for lbl in class_labels], dtype=np.float32)
        probs        = probs * mask
        hint_applied = True

    top_idx   = np.argsort(probs)[::-1][:topk]
    top_preds = [{"class": class_labels[int(i)],
                  "confidence": round(float(probs[int(i)]) * 100, 2)}
                 for i in top_idx]

    top1_label = class_labels[int(top_idx[0])]
    top1_conf  = float(probs[int(top_idx[0])])

    if hint_applied:
        total = probs.sum()
        if total > 0:
            top1_conf = top1_conf / total

    norm_key = " ".join(top1_label.strip().lower().split())
    cure     = cure_db.get(norm_key,
               "No cure information available. Please consult a plant expert.")

    if top1_conf < CONF_THRESHOLD:
        result = {
            "predicted_class": "uncertain",
            "confidence":      round(top1_conf * 100, 2),
            "low_confidence":  True,
            "message":         "Uncertain – upload a clear, close-up leaf photo in daylight.",
            "top_predictions": top_preds,
            "cure":            "Not provided – confidence too low.",
            "crop_hint":       crop_hint,
        }
    else:
        result = {
            "predicted_class": top1_label,
            "confidence":      round(top1_conf * 100, 2),
            "low_confidence":  False,
            "message":         "Prediction confidence is acceptable.",
            "top_predictions": top_preds,
            "cure":            cure,
            "crop_hint":       crop_hint,
        }

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
