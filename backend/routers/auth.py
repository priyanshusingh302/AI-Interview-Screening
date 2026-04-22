import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

from models import Token, TokenData, AdminUserInDB
from database import admin_collection
import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "b3a4c5f9d12e8b7c4a1f3d8a9c2b4d5e1f0c3b2e5d7a9f8c0b2e3f4d1c9a6b8")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_admin(username: str):
    admin_data = await admin_collection.find_one({"username": username})
    if admin_data:
        return AdminUserInDB(**admin_data)

async def get_current_admin(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    admin = await get_admin(username=token_data.username)
    if admin is None:
        raise credentials_exception
    return admin

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    admin = await get_admin(form_data.username)
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Utility route to inject initial admin
@router.post("/setup")
async def setup_initial_admin():
    admin_count = await admin_collection.count_documents({})
    if admin_count > 0:
        raise HTTPException(status_code=400, detail="Admin already exists.")
    
    hashed = get_password_hash("admin")
    await admin_collection.insert_one({"username": "admin", "hashed_password": hashed})
    return {"message": "Admin user 'admin' created with password 'admin'."}
