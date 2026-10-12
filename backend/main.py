from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import shutil
import os

from models import Product, Base
from database import engine, SessionLocal

app = FastAPI()

# Serve static files from /uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Allow frontend to connect (dev only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads folder exists
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Create DB tables
Base.metadata.create_all(bind=engine)

@app.post("/products")
async def create_product(
    name: str = Form(...),
    price: float = Form(...),
    stock: int = Form(...),
    youtubeUrl: str = Form(...),
    image: UploadFile = File(...)
):
    image_filename = image.filename
    image_path = os.path.join(UPLOAD_FOLDER, image_filename)
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    db = SessionLocal()
    new_product = Product(
        name=name,
        price=price,
        stock=stock,
        image_path=image_filename,
        youtube_url=youtubeUrl
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    db.close()

    return {
        "message": "Product saved",
        "product": {
            "id": new_product.id,
            "name": new_product.name,
            "price": new_product.price,
            "stock": new_product.stock,
            "image_path": new_product.image_path,
            "youtube_url": new_product.youtube_url
        }
    }

@app.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(...),
    price: float = Form(...),
    stock: int = Form(...),
    youtubeUrl: str = Form(...),
    image: UploadFile = File(None)
):
    db = SessionLocal()
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        db.close()
        raise HTTPException(status_code=404, detail="Product not found")

    if image:
        old_image_path = os.path.join(UPLOAD_FOLDER, product.image_path)
        if os.path.exists(old_image_path):
            os.remove(old_image_path)

        image_filename = image.filename
        image_path = os.path.join(UPLOAD_FOLDER, image_filename)
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        product.image_path = image_filename

    product.name = name
    product.price = price
    product.stock = stock
    product.youtube_url = youtubeUrl

    db.commit()
    db.refresh(product)
    db.close()

    return {"message": "Product updated successfully"}

@app.get("/products")
def get_products():
    db = SessionLocal()
    products = db.query(Product).all()
    db.close()
    return JSONResponse(content=[
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "stock": p.stock,
            "image_path": p.image_path,
            "youtube_url": p.youtube_url
        } for p in products
    ])

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    db = SessionLocal()
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        db.close()
        raise HTTPException(status_code=404, detail="Product not found")

    image_path = os.path.join(UPLOAD_FOLDER, product.image_path)
    if os.path.exists(image_path):
        os.remove(image_path)

    db.delete(product)
    db.commit()
    db.close()
    return {"message": "Product deleted successfully"}

@app.delete("/products")
def delete_all_products():
    db = SessionLocal()
    products = db.query(Product).all()

    for product in products:
        image_path = os.path.join(UPLOAD_FOLDER, product.image_path)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.query(Product).delete()
    db.commit()
    db.close()
    return {"message": "All products deleted"}
