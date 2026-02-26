"""
FarmWise – Plant Disease Detection API
Uses full TensorFlow with warmup prediction for faster first response.
"""

import ast
import io
import json
import os
import time
from pathlib import Path

import gdown
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageEnhance

# ── Paths ─────────────────────────────────────────────────────────────────────
ASSETS_DIR   = Path("assets")
MODEL_PATH   = ASSETS_DIR / "plant_disease.h5"
CLASSES_PATH = ASSETS_DIR / "list_of_classes.txt"
CURE_PATH    = ASSETS_DIR / "cure.json"

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


# ── Flask app (create FIRST so port opens fast) ──────────────────────────────
app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# ── Globals (populated during startup) ────────────────────────────────────────
model        = None
class_labels = None
cure_db      = None
MODEL_H      = 200
MODEL_W      = 200
is_ready     = False


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


def load_model():
    """Load model and run a warmup prediction to compile the TF graph."""
    global model, class_labels, cure_db, MODEL_H, MODEL_W, is_ready

    download_assets()

    print("[model] Loading TensorFlow…")
    import tensorflow as tf

    print("[model] Loading .h5 model…")
    model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
    _, MODEL_H, MODEL_W, _ = model.input_shape
    print(f"[model] Loaded. Input: {MODEL_H}x{MODEL_W}")

    with open(CLASSES_PATH, "r", encoding="utf-8") as f:
        class_labels = ast.literal_eval(f.read())

    with open(CURE_PATH, "r", encoding="utf-8") as f:
        cure_db = {" ".join(k.strip().lower().split()): v for k, v in json.load(f).items()}

    print(f"[model] {len(class_labels)} classes loaded.")

    # Warmup: first prediction is always slow (TF compiles graph)
    # Do it now so real requests are fast
    print("[model] Running warmup prediction…")
    t0 = time.time()
    dummy = np.zeros((1, MODEL_H, MODEL_W, 3), dtype=np.float32)
    model.predict(dummy, verbose=0)
    print(f"[model] Warmup done in {time.time() - t0:.1f}s")

    is_ready = True
    print("[model] READY — accepting predictions.")


# Load in the gunicorn worker process
load_model()


# ── Preprocessing ─────────────────────────────────────────────────────────────
def preprocess(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    mw, mh = int(w * 0.10), int(h * 0.10)
    img = img.crop((mw, mh, w - mw, h - mh))
    img = ImageEnhance.Contrast(img).enhance(1.3)
    img = ImageEnhance.Sharpness(img).enhance(1.3)
    img = img.resize((MODEL_W, MODEL_H), Image.LANCZOS)
    return np.expand_dims(np.asarray(img, dtype=np.float32), axis=0)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status":      "ok" if is_ready else "loading",
        "service":     "FarmWise Plant Disease API",
        "classes":     len(class_labels) if class_labels else 0,
        "input_shape": f"{MODEL_H}x{MODEL_W}",
    })


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 200

    if not is_ready:
        return jsonify({"error": "Model is still loading. Please wait ~30 seconds and try again."}), 503

    if "image" not in request.files:
        return jsonify({"error": "Send a multipart/form-data POST with key 'image'."}), 400

    crop_hint = request.form.get("crop", "").strip().lower() or None
    topk      = max(1, min(int(request.form.get("topk", 3)), len(class_labels)))

    try:
        x = preprocess(request.files["image"].read())
    except Exception as e:
        return jsonify({"error": f"Image processing failed: {e}"}), 422

    t0 = time.time()
    probs        = model.predict(x, verbose=0)[0].copy()
    inference_ms = round((time.time() - t0) * 1000)
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
            "inference_ms":    inference_ms,
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
            "inference_ms":    inference_ms,
        }

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
