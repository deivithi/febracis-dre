"""Gera public/images/logo-febracis.png a partir do logo horizontal oficial (fundo preto → transparente)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

# Logo completo: águia + FEBRACIS + linhas de texto (PNG fornecido pelo utilizador)
SRC = Path(
    r"C:\Users\PC\.cursor\projects\c-Users-PC-OneDrive-Documents-VS-CODE\assets"
    r"\c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_35aa6059bb880303fd1f36d87469352e_images_Aplicac_a_o-Logo-Febracis---2024Logo-01a07db4-f0a4-4cd3-94da-b0f5d4f808ed.png",
)
OUT = Path(__file__).resolve().parents[1] / "public" / "images" / "logo-febracis.png"

# Largura útil na sidebar ~212px; 2× para retina ≈ 424–440px de largura exportada
TARGET_MAX_WIDTH = 440
THRESH = 46


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(str(SRC))

    im = Image.open(SRC).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if max(r, g, b) < THRESH:
                px[x, y] = (r, g, b, 0)

    box = im.getbbox()
    if not box:
        raise RuntimeError("empty canvas after masking")

    im = im.crop(box)
    pad_x = max(2, int(im.width * 0.03))
    pad_y = max(2, int(im.height * 0.06))
    canvas = Image.new("RGBA", (im.width + 2 * pad_x, im.height + 2 * pad_y), (0, 0, 0, 0))
    canvas.alpha_composite(im, (pad_x, pad_y))

    if canvas.width > TARGET_MAX_WIDTH:
        scale = TARGET_MAX_WIDTH / canvas.width
        nw = TARGET_MAX_WIDTH
        nh = max(1, int(canvas.height * scale))
        canvas = canvas.resize((nw, nh), Image.Resampling.LANCZOS)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, optimize=True)
    print("wrote", OUT, "size", canvas.size)


if __name__ == "__main__":
    main()
