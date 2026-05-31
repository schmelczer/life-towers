"""Pydantic v2 models matching the API spec exactly."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator
import uuid as _uuid_mod


def _canonical_uuidv4(value: str) -> str:
    try:
        u = _uuid_mod.UUID(value)
        if u.version == 4:
            return str(u)
    except (ValueError, AttributeError):
        pass
    raise ValueError("must be a UUIDv4")


class HslColor(BaseModel):
    h: float = Field(ge=0.0, le=1.0)
    s: float = Field(ge=0.0, le=1.0)
    l: float = Field(ge=0.0, le=1.0)


class BlockIn(BaseModel):
    id: str
    tag: str = Field(max_length=200)
    description: str = Field(max_length=10_000)
    is_done: bool
    difficulty: int = Field(default=1, ge=1, le=100)
    created_at: Optional[int] = None

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _canonical_uuidv4(v)


class BlockOut(BaseModel):
    id: str
    tag: str
    description: str
    is_done: bool
    difficulty: int
    created_at: int


class TowerIn(BaseModel):
    id: str
    name: str = Field(max_length=200)
    base_color: HslColor
    blocks: list[BlockIn] = Field(max_length=1000)

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _canonical_uuidv4(v)


class TowerOut(BaseModel):
    id: str
    name: str
    base_color: HslColor
    blocks: list[BlockOut]


class PageIn(BaseModel):
    id: str
    name: str = Field(max_length=200)
    hide_create_tower_button: bool = False
    keep_tasks_open: bool = False
    default_date_from: Optional[int] = None
    default_date_to: Optional[int] = None
    towers: list[TowerIn] = Field(max_length=100)

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _canonical_uuidv4(v)


class PageOut(BaseModel):
    id: str
    name: str
    hide_create_tower_button: bool
    keep_tasks_open: bool
    default_date_from: Optional[int]
    default_date_to: Optional[int]
    towers: list[TowerOut]


class DataIn(BaseModel):
    pages: list[PageIn] = Field(max_length=100)

    @model_validator(mode="after")
    def check_unique_ids(self) -> "DataIn":
        page_ids: set[str] = set()
        tower_ids: set[str] = set()
        block_ids: set[str] = set()
        total_blocks = 0

        for page in self.pages:
            if page.id in page_ids:
                raise ValueError(f"Duplicate page id: {page.id}")
            page_ids.add(page.id)

            for tower in page.towers:
                if tower.id in tower_ids:
                    raise ValueError(f"Duplicate tower id: {tower.id}")
                tower_ids.add(tower.id)

                for block in tower.blocks:
                    if block.id in block_ids:
                        raise ValueError(f"Duplicate block id: {block.id}")
                    block_ids.add(block.id)
                    total_blocks += 1

        if total_blocks > 50_000:
            raise ValueError(
                f"Total blocks ({total_blocks}) exceeds maximum of 50,000"
            )

        return self


class DataOut(BaseModel):
    pages: list[PageOut]


class RegisterRequest(BaseModel):
    token: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        return _canonical_uuidv4(v)


class RegisterResponse(BaseModel):
    user_id: str


class HealthResponse(BaseModel):
    status: str
