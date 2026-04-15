from fastapi import APIRouter, HTTPException , status
from app.models.Notes import Notes
from sqlmodel import Session, select

router = APIRouter(prefix="/Notes", tags=["Notes"])
from ..database import engine

@router.get("/", summary="Get all Notes")
async def get_all():
    with Session(engine) as session:
        statement = select(Notes)
        results = session.exec(statement).all()
        return results



@router.post("/", summary="Create a new Notes", status_code=status.HTTP_201_CREATED)
async def create_item(_Notes : Notes):
    with Session(engine) as session:
        session.add(_Notes)
        session.commit()
        session.refresh(_Notes)
        return _Notes


@router.get("/{item_id}", summary="Get Notes by ID")
async def get_item(item_id: int):
    with Session(engine) as session:
        item = session.get(Notes, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Notes not found")
        return item



@router.put("/{item_id}", summary="Update Notes")
async def update_item(_Notes : Notes , item_id: int):
    with Session(engine) as session:

        item = session.get(Notes, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Notes not found")

        for key, value in _Notes.model_dump(exclude_unset=True).items():
            setattr(item, key, value)

        session.add(item)
        session.commit()
        session.refresh(item)
        return item


@router.delete("/{item_id}", summary="Delete Notes" ,status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int):

    with Session(engine) as session:
        item = session.get(Notes, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Notes not found")

        session.delete(item)
        session.commit()
        return None
