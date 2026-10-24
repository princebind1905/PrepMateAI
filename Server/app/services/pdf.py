import io
import re

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PAGES = 12


class ResumeParseError(ValueError):
    pass


def extract_resume_text(data: bytes, max_chars: int) -> str:
    """Extract and normalise text from a PDF resume (CPU-bound; call via a thread)."""
    if not data.startswith(b"%PDF"):
        raise ResumeParseError("Uploaded file is not a valid PDF")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ResumeParseError("Password-protected PDFs are not supported")
        pages = [(p.extract_text() or "") for p in reader.pages[:MAX_PAGES]]
    except PdfReadError as exc:
        raise ResumeParseError("Could not read the PDF file") from exc

    text = "\n".join(pages)
    text = re.sub(r"[ \t]+", " ", text)          # collapse spaces
    text = re.sub(r"\n{3,}", "\n\n", text).strip()  # collapse blank lines
    if len(text) < 80:
        raise ResumeParseError(
            "No readable text found in the PDF (it may be a scanned image). Upload a text-based PDF."
        )
    return text[:max_chars]
