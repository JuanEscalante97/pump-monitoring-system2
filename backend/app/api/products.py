from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Product, User
from app.schemas.schemas import ProductCreate, ProductResponse
from app.core.security import get_current_user
from app.core.audit import log_audit_action, get_client_ip

router = APIRouter(prefix="/api/products", tags=["Catálogo - Productos"])

@router.get("", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).order_by(Product.nombre.asc()).all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(request: Request, prod_in: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Product).filter(Product.nombre == prod_in.nombre).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un producto con el nombre {prod_in.nombre}")
    
    prod = Product(**prod_in.model_dump())
    db.add(prod)
    db.commit()
    db.refresh(prod)

    log_audit_action(db, current_user, "CREATE_PRODUCT", "Product", prod.id, get_client_ip(request), f"Producto creado: {prod.nombre}")
    return prod

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(request: Request, product_id: int, prod_in: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    for key, val in prod_in.model_dump().items():
        setattr(prod, key, val)
        
    db.commit()
    db.refresh(prod)
    log_audit_action(db, current_user, "UPDATE_PRODUCT", "Product", prod.id, get_client_ip(request), f"Producto actualizado: {prod.nombre}")
    return prod

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(request: Request, product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    try:
        db.delete(prod)
        db.commit()
        log_audit_action(db, current_user, "DELETE_PRODUCT", "Product", product_id, get_client_ip(request), f"Producto eliminado: {prod.nombre}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar el producto porque tiene operaciones asociadas.")
