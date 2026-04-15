from sqlmodel import Field, SQLModel


class Notes(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    content: str