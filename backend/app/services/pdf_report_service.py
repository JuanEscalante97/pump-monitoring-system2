import io
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy.orm import Session
from app.models.models import Operation, Measurement

def generate_operation_pdf_report(db: Session, operation: Operation) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    story = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1A365D'),
        spaceAfter=6,
        alignment=1 # Center
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#4a5568'),
        alignment=1
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1A365D'),
        spaceBefore=10,
        spaceAfter=6
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=11
    )
    header_cell_style = ParagraphStyle(
        'HeaderTableCell',
        parent=cell_style,
        fontSize=9,
        leading=11,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )

    # 1. Header
    story.append(Paragraph("SISTEMA DE MONITOREO DE CONDICIÓN DE BOMBAS DE TRANSFERENCIA", title_style))
    story.append(Paragraph("REPORTE OFICIAL DE OPERACIÓN Y MEDICIONES DE CAMPO", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1A365D'), spaceAfter=15))

    # 2. General Operation Details
    tanks_str = ", ".join([t.codigo for t in operation.tanks]) if operation.tanks else "N/A"
    pumps_str = ", ".join([f"{p.codigo} ({p.nombre})" for p in operation.pumps]) if operation.pumps else "N/A"

    op_data = [
        [
            Paragraph(f"<b>Código Operación:</b> {operation.codigo_operacion}", cell_style),
            Paragraph(f"<b>Fecha:</b> {operation.fecha}", cell_style),
            Paragraph(f"<b>Estado:</b> {operation.estado}", cell_style)
        ],
        [
            Paragraph(f"<b>Buque:</b> {operation.buque.nombre if operation.buque else 'N/A'}", cell_style),
            Paragraph(f"<b>Empresa:</b> {operation.buque.empresa if operation.buque else 'N/A'}", cell_style),
            Paragraph(f"<b>Producto:</b> {operation.producto.nombre if operation.producto else 'N/A'}", cell_style)
        ],
        [
            Paragraph(f"<b>Tanques Origen:</b> {tanks_str}", cell_style),
            Paragraph(f"<b>Bombas Operativas:</b> {pumps_str}", cell_style),
            Paragraph(f"<b>Responsable:</b> {operation.responsable.full_name if operation.responsable else 'N/A'}", cell_style)
        ],
        [
            Paragraph(f"<b>Hora Inicio:</b> {operation.hora_inicio}", cell_style),
            Paragraph(f"<b>Hora Fin:</b> {operation.hora_fin or 'En Proceso'}", cell_style),
            Paragraph(f"<b>Observaciones:</b> {operation.observaciones or 'Ninguna'}", cell_style)
        ]
    ]

    t_info = Table(op_data, colWidths=[240, 240, 240])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f7fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 15))

    measurements = db.query(Measurement).filter(
        Measurement.operation_id == operation.id
    ).order_by(Measurement.datetime_registro.asc()).all()

    if measurements:
        max_temp = max([m.temperatura_c for m in measurements])
        max_curr = max([m.corriente_a for m in measurements])
        first_temp = measurements[0].temperatura_c
        last_temp = measurements[-1].temperatura_c
        temp_delta = last_temp - first_temp
        
        tendencia_txt = "ESTABLE"
        if temp_delta > 10:
            tendencia_txt = "INCREMENTO ACELERADO (Riesgo de Sobrecalentamiento)"
        elif temp_delta < -10:
            tendencia_txt = "ENFRIAMIENTO RÁPIDO"
        
        story.append(Paragraph("RESUMEN DE ANÁLISIS PREDICTIVO", heading_style))
        predictive_data = [
            [
                Paragraph(f"<b>Temperatura Máxima Alcanzada:</b> {max_temp:.1f} °C", cell_style),
                Paragraph(f"<b>Corriente Máxima Alcanzada:</b> {max_curr:.1f} A", cell_style)
            ],
            [
                Paragraph(f"<b>Diferencial Térmico (Inicio - Fin):</b> {temp_delta:+.1f} °C", cell_style),
                Paragraph(f"<b>Tendencia Calculada:</b> {tendencia_txt}", cell_style)
            ]
        ]
        t_pred = Table(predictive_data, colWidths=[360, 360])
        t_pred.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e0f2fe')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#bae6fd')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#7dd3fc')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t_pred)
        story.append(Spacer(1, 15))

    # 3. Measurement Records Table
    story.append(Paragraph("REGISTRO DETALLADO DE MEDICIONES DE CAMPO", heading_style))

    table_data = [
        [
            Paragraph("#", header_cell_style),
            Paragraph("Hora Real", header_cell_style),
            Paragraph("Bomba", header_cell_style),
            Paragraph("P. Succión (inHg)", header_cell_style),
            Paragraph("P. Descarga (psi)", header_cell_style),
            Paragraph("Temp. Motor (°C)", header_cell_style),
            Paragraph("Temp. Bomba (°C)", header_cell_style),
            Paragraph("Corriente (A)", header_cell_style),
            Paragraph("Estado", header_cell_style),
            Paragraph("Inspector / Técnico", header_cell_style),
            Paragraph("Observaciones", header_cell_style)
        ]
    ]

    for idx, m in enumerate(measurements, 1):
        bomba_code = m.bomba.codigo if m.bomba else f"Bomba {m.bomba_id}"
        tech_name = m.registrado_por.full_name if m.registrado_por else "N/A"
        is_alarm = m.temperatura_c > 80.0 or m.corriente_a > 45.0
        status_txt = "<font color='red'><b>ALARMA</b></font>" if is_alarm else "<font color='green'><b>NORMAL</b></font>"
        if m.is_corrected:
            status_txt += " (Corregido)"

        table_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph(m.hora_registro.strftime("%H:%M:%S") if m.hora_registro else "", cell_style),
            Paragraph(bomba_code, cell_style),
            Paragraph(f"{m.presion_succion_inhg:.2f}" if m.presion_succion_inhg is not None else "-", cell_style),
            Paragraph(f"{m.presion_descarga_psi:.2f}", cell_style),
            Paragraph(f"{m.temperatura_c:.1f}", cell_style),
            Paragraph(f"{m.temperatura_bomba_c:.1f}" if m.temperatura_bomba_c is not None else "-", cell_style),
            Paragraph(f"{m.corriente_a:.1f}", cell_style),
            Paragraph(status_txt, cell_style),
            Paragraph(tech_name, cell_style),
            Paragraph(m.observaciones or "-", cell_style)
        ])

    if len(measurements) == 0:
        table_data.append([Paragraph("No se registraron mediciones en esta operación", cell_style)] + [Paragraph("", cell_style)] * 10)

    t_meas = Table(table_data, colWidths=[20, 55, 55, 75, 75, 70, 70, 65, 65, 95, 75])
    t_meas.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A365D')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meas)
    story.append(Spacer(1, 30))

    # 4. Signature Block
    sig_data = [
        [
            Paragraph("________________________________________<br/><b>Firma del Responsable de Mantenimiento</b>", cell_style),
            Paragraph("________________________________________<br/><b>Firma del Supervisor de Operaciones</b>", cell_style)
        ]
    ]
    t_sig = Table(sig_data, colWidths=[360, 360])
    t_sig.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
    ]))
    story.append(t_sig)

    doc.build(story)
    buffer.seek(0)
    return buffer
