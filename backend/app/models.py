from sqlalchemy import Column, Integer, String, Text, DateTime, func
from .db import Base


class AdminDecision(Base):
    """
    Frozen schema — do not rename fields without updating SHARED_CONTRACT.md.
    Maps to the admin_decisions table spec (Section 6).
    """
    __tablename__ = "admin_decisions"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, nullable=True)        # FK → corridors (nullable while upstream unavailable)
    event_id = Column(Integer, nullable=True)           # FK → events (nullable)
    recommendation = Column(Text, nullable=False)       # The LLM-generated action text
    decision = Column(String(20), nullable=False)       # accepted | modified | rejected
    assigned_team = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
