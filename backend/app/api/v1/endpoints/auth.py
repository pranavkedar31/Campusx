"""
Authentication and session management API routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserResponse, UserCreate, ChangePasswordRequest

from app.services.audit_service import log_audit

router = APIRouter()


@router.post("/login", response_model=Token, summary="User Login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with email and password, returning JWT access token and user metadata.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        log_audit(
            db,
            action="AUTH_LOGIN_FAILURE",
            entity_type="AUTH",
            user_email=login_data.email,
            details={"reason": "Invalid credentials provided"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_audit(
            db,
            action="AUTH_LOGIN_BLOCKED",
            entity_type="AUTH",
            user=user,
            details={"reason": "Inactive account attempt"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive. Contact your campus administrator."
        )

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.value}
    )

    log_audit(
        db,
        action="AUTH_LOGIN_SUCCESS",
        entity_type="AUTH",
        user=user,
        details={"role": user.role.value}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse, summary="Get Current User Profile")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve authenticated user profile and active role permissions.
    """
    return UserResponse.model_validate(current_user)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register User")
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account (defaults to STUDENT role).
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)


@router.post("/change-password", summary="Change Password")
def change_password(
    pwd_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update password for the currently authenticated user.
    """
    if not verify_password(pwd_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )

    current_user.password_hash = get_password_hash(pwd_data.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully."}


@router.post("/logout", summary="Logout Session")
def logout(current_user: User = Depends(get_current_user)):
    """
    Client-side token invalidation confirmation.
    """
    return {"status": "success", "message": f"Session terminated for user {current_user.email}."}
