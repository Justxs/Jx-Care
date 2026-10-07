# Renders the Jx Care app icon PNGs with Pillow. Geometry mirrors assets/brand/logo.svg.
# Usage: python3 assets/brand/render-icons.py   (writes to assets/images/)
import math, os
from PIL import Image, ImageDraw

PINK = (217, 79, 135, 255)  # #d94f87
WHITE = (255, 255, 255, 255)
SS = 4  # supersampling factor for smooth edges


def cubic(p0, p1, p2, p3, n=40):
    return [((1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t*t*p2[0] + t**3*p3[0],
             (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t*t*p2[1] + t**3*p3[1])
            for t in [i/n for i in range(n+1)]]


def quad(p0, p1, p2, n=40):
    return [((1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0],
             (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1])
            for t in [i/n for i in range(n+1)]]


HEAD = (cubic((24, 132), (24, 100), (58, 90), (100, 90)) + cubic((100, 90), (142, 90), (176, 100), (176, 132))
        + cubic((176, 132), (176, 164), (144, 180), (100, 180)) + cubic((100, 180), (56, 180), (24, 164), (24, 132)))


def frog_mask(size, scale, cx, cy):
    """L image at size*SS where the frog is 255. Logo centre (100,116) maps to (cx,cy)."""
    W = size*SS
    k = scale*SS
    T = lambda p: ((p[0]-100)*k + cx*SS, (p[1]-116)*k + cy*SS)

    def circ(d, x, y, r, fill):
        d.ellipse([T((x-r, y-r)), T((x+r, y+r))], fill=fill)

    def stroke(d, pts, w, fill):
        P = [T(p) for p in pts]
        d.line(P, fill=fill, width=max(1, round(w*k)), joint="curve")
        for p in (P[0], P[-1]):
            d.ellipse([p[0]-w*k/2, p[1]-w*k/2, p[0]+w*k/2, p[1]+w*k/2], fill=fill)

    head = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(head)
    d.polygon([T(p) for p in HEAD], fill=255)
    for x in (62, 138):
        circ(d, x, 88, 35, 0)
    stroke(d, quad((68, 140), (100, 164), (132, 140)), 6.5, 0)
    circ(d, 92, 120, 2.6, 0)
    circ(d, 108, 120, 2.6, 0)

    eyes = Image.new("L", (W, W), 0)
    e = ImageDraw.Draw(eyes)
    for x in (62, 138):
        circ(e, x, 88, 30, 255)
        e.ellipse([T((x-27, 88-27)), T((x+27, 88+27))], outline=0, width=round(4*k))
        circ(e, x, 88, 23, 255)
        for a in range(0, 360, 60):
            sx = x + 11.5*math.cos(math.radians(a))
            sy = 88 + 11.5*math.sin(math.radians(a))
            rot = math.radians(a+90)
            pts = []
            for i in range(36):
                t = 2*math.pi*i/36
                px, py = 2.3*math.cos(t), 3.8*math.sin(t)
                pts.append(T((sx + px*math.cos(rot) - py*math.sin(rot), sy + px*math.sin(rot) + py*math.cos(rot))))
            e.polygon(pts, fill=0)

    m = Image.new("L", (W, W), 0)
    m.paste(255, (0, 0), head)
    m.paste(255, (0, 0), eyes)
    return m


def render(path, size, fraction, fg, bg=None):
    """fraction = share of the canvas width the logo (168 units wide) takes."""
    m = frog_mask(size, fraction*size/168, size/2, size/2)
    W = size*SS
    img = Image.new("RGBA", (W, W), bg or (0, 0, 0, 0))
    img.paste(Image.new("RGBA", (W, W), fg), (0, 0), m)
    img = img.resize((size, size), Image.LANCZOS)
    img.quantize(colors=48, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)


out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "images")
render(os.path.join(out, "icon.png"), 1024, 0.66, WHITE, PINK)
render(os.path.join(out, "adaptive-icon.png"), 1024, 0.52, WHITE)
render(os.path.join(out, "splash-icon.png"), 1024, 0.90, PINK)
render(os.path.join(out, "favicon.png"), 48, 0.80, WHITE, PINK)
print("Wrote icon.png, adaptive-icon.png, splash-icon.png, favicon.png")
