import os
from uuid import uuid4

import pdfplumber
from docx import Document
from fastapi import UploadFile

from ..config import settings

os.makedirs(settings.upload_dir, exist_ok=True)


def save_upload_file(upload_file: UploadFile) -> str:
    ext = os.path.splitext(upload_file.filename)[1].lower()
    filename = f"{uuid4()}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    with open(filepath, "wb") as buffer:
        buffer.write(upload_file.file.read())

    return filepath


def extract_text_from_file(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".pdf":
        text = ""
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    if ext in [".doc", ".docx"]:
        doc = Document(filepath)
        return "\n".join(p.text for p in doc.paragraphs)

    # fallback
    return ""
