from fastapi import APIRouter, HTTPException, Query

from ..schemas.recommendation import APIEnvelope
from ..services import traffic_service


router = APIRouter(tags=["traffic"])


def service_error(exc: Exception) -> HTTPException:
    return HTTPException(status_code=500, detail=f"Traffic service failure: {exc}")


@router.get("/traffic/current", response_model=APIEnvelope)
def get_current_traffic():
    try:
        return APIEnvelope(success=True, data=traffic_service.current_traffic())
    except traffic_service.TrafficDataError as exc:
        raise service_error(exc) from exc


@router.get("/traffic/forecast", response_model=APIEnvelope)
def get_traffic_forecast(
    corridor_id: str = Query(..., min_length=1),
    horizon: str = Query(...),
):
    if horizon not in traffic_service.HORIZON_MINUTES:
        raise HTTPException(status_code=400, detail="horizon must be one of: 1h, 3h, 6h")
    if corridor_id not in traffic_service.corridors():
        raise HTTPException(status_code=404, detail=f"Unknown corridor_id: {corridor_id}")
    try:
        return APIEnvelope(success=True, data=traffic_service.forecast_for_corridor(corridor_id, horizon))
    except traffic_service.TrafficDataError as exc:
        raise service_error(exc) from exc


@router.get("/bottlenecks", response_model=APIEnvelope)
def get_bottlenecks():
    try:
        return APIEnvelope(success=True, data=traffic_service.bottlenecks())
    except traffic_service.TrafficDataError as exc:
        raise service_error(exc) from exc


@router.get("/analytics/model-evaluation", response_model=APIEnvelope)
def get_model_evaluation():
    try:
        return APIEnvelope(success=True, data=traffic_service.model_evaluations())
    except traffic_service.TrafficDataError as exc:
        raise service_error(exc) from exc
