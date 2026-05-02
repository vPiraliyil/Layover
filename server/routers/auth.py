from fastapi import APIRouter, Depends

from middleware.auth import require_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def get_me(user: dict = Depends(require_user)) -> dict[str, str]:
    return {"sub": user["sub"], "email": user["email"]}
