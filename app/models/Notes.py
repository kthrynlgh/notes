from sqlmodel import Field, SQLModel


class Notes(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    content:  str           = ""
    x:        float         = 0
    y:        float         = 0
    rotation: float         = 0
    color:    int           = 0