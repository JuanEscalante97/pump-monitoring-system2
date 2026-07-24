from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Operation, User
from app.core.security import get_current_user
from app.services.pdf_report_service import generate_operation_pdf_report
from app.services.excel_report_service import generate_operation_excel_report

router = APIRouter(prefix="/api/reports", tags=["Reportes PDF & Excel"])

@router.get("/operation/{operation_id}/pdf")
def download_operation_pdf(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operación no encontrada")

    pdf_buffer = generate_operation_pdf_report(db, operation)
    filename = f"Reporte_Operacion_{operation.codigo_operacion}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/operation/{operation_id}/excel")
def download_operation_excel(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    operation = db.query(Operation).filter(Operation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operación no encontrada")

    excel_buffer = generate_operation_excel_report(db, operation)
    filename = f"Reporte_Operacion_{operation.codigo_operacion}.xlsx"

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
