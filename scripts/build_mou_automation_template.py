from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


SOURCE = Path("/Users/noahlarsen/Downloads/New MOU Template.docx")
OUTPUT = Path("templates/mou/lia-mou-automation-template.docx")

PARTY_PLACEHOLDER = "{{contracting_party_name}}"
SCHOOL_PLACEHOLDER = "{{school_name}}"


def replace_in_runs(paragraph, old: str, new: str) -> int:
    replacements = 0

    for run in paragraph.runs:
        count = run.text.count(old)
        if count:
            run.text = run.text.replace(old, new)
            replacements += count

    return replacements


def set_cell_shading(cell, fill: str) -> None:
    cell_properties = cell._tc.get_or_add_tcPr()
    shading = cell_properties.find(qn("w:shd"))

    if shading is None:
        shading = OxmlElement("w:shd")
        cell_properties.append(shading)

    shading.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=120, start=140, bottom=120, end=140) -> None:
    cell_properties = cell._tc.get_or_add_tcPr()
    margins = cell_properties.first_child_found_in("w:tcMar")

    if margins is None:
        margins = OxmlElement("w:tcMar")
        cell_properties.append(margins)

    for margin_name, value in (
        ("top", top),
        ("start", start),
        ("bottom", bottom),
        ("end", end),
    ):
        margin = margins.find(qn(f"w:{margin_name}"))
        if margin is None:
            margin = OxmlElement(f"w:{margin_name}")
            margins.append(margin)
        margin.set(qn("w:w"), str(value))
        margin.set(qn("w:type"), "dxa")


def set_table_borders(table) -> None:
    table_properties = table._tbl.tblPr
    borders = table_properties.first_child_found_in("w:tblBorders")

    if borders is None:
        borders = OxmlElement("w:tblBorders")
        table_properties.append(borders)

    for border_name in ("top", "left", "bottom", "right", "insideH", "insideV"):
        border = borders.find(qn(f"w:{border_name}"))
        if border is None:
            border = OxmlElement(f"w:{border_name}")
            borders.append(border)
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "6")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "D9D9D9")


def set_table_width(table, width_dxa: int) -> None:
    table_properties = table._tbl.tblPr
    table_width = table_properties.first_child_found_in("w:tblW")

    if table_width is None:
        table_width = OxmlElement("w:tblW")
        table_properties.append(table_width)

    table_width.set(qn("w:w"), str(width_dxa))
    table_width.set(qn("w:type"), "dxa")

    grid = table._tbl.tblGrid
    grid_columns = grid.findall(qn("w:gridCol"))
    column_widths = (7900, width_dxa - 7900)
    for column, width in zip(grid_columns, column_widths):
        column.set(qn("w:w"), str(width))


def set_cell_text(cell, text: str, *, bold=False, color="222222", align=None) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.alignment = align
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "Arimo"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor.from_string(color)
    run_properties = run._element.get_or_add_rPr()
    fonts = run_properties.rFonts
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        run_properties.insert(0, fonts)
    fonts.set(qn("w:ascii"), "Arimo")
    fonts.set(qn("w:hAnsi"), "Arimo")


def build_pricing_table(document: Document) -> None:
    old_table = document.tables[0]
    new_table = document.add_table(rows=8, cols=2)
    new_table.autofit = False
    set_table_width(new_table, 10725)
    set_table_borders(new_table)

    for row in new_table.rows:
        row.cells[0].width = Inches(5.5)
        row.cells[1].width = Inches(1.95)
        for cell in row.cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)

    launch_header = new_table.cell(0, 0).merge(new_table.cell(0, 1))
    set_cell_shading(launch_header, "C4122F")
    set_cell_text(
        launch_header,
        "FIRST-YEAR LAUNCH PRICING - {{launch_school_year}}",
        bold=True,
        color="FFFFFF",
    )

    renewal_header = new_table.cell(4, 0).merge(new_table.cell(4, 1))
    set_cell_shading(renewal_header, "C4122F")
    set_cell_text(
        renewal_header,
        "ANNUAL RENEWAL PRICING - {{renewal_school_year}}",
        bold=True,
        color="FFFFFF",
    )

    rows = (
        (1, "First-Year Launch Price", "{{launch_base_price}}", False),
        (2, "Launch Discount - {{launch_discount_name}}", "- {{launch_discount_amount}}", False),
        (3, "Final First-Year Launch Price", "{{launch_final_price}}", True),
        (5, "Annual Renewal Price", "{{renewal_base_price}}", False),
        (6, "Renewal Discount - {{renewal_discount_name}}", "- {{renewal_discount_amount}}", False),
        (7, "Final Annual Renewal Price", "{{renewal_final_price}}", True),
    )

    for row_index, label, amount, is_total in rows:
        if is_total:
            set_cell_shading(new_table.cell(row_index, 0), "F2F2F2")
            set_cell_shading(new_table.cell(row_index, 1), "F2F2F2")
        set_cell_text(new_table.cell(row_index, 0), label, bold=is_total)
        set_cell_text(
            new_table.cell(row_index, 1),
            amount,
            bold=is_total,
            align=WD_ALIGN_PARAGRAPH.RIGHT,
        )

    old_table._tbl.addprevious(new_table._tbl)
    old_table._element.getparent().remove(old_table._element)


def build_template() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source template not found: {SOURCE}")

    document = Document(SOURCE)
    original_placeholder = "[Name of School or District]"
    party_replacements = 0
    school_replacements = 0

    for paragraph_index, paragraph in enumerate(document.paragraphs):
        if paragraph_index == 74:
            school_replacements += replace_in_runs(
                paragraph,
                original_placeholder,
                SCHOOL_PLACEHOLDER,
            )
        else:
            party_replacements += replace_in_runs(
                paragraph,
                original_placeholder,
                PARTY_PLACEHOLDER,
            )

        replace_in_runs(paragraph, "2025-2026", "{{effective_school_year}}")
        replace_in_runs(paragraph, "03/24/26", "{{lia_signature_date}}")
        replace_in_runs(
            paragraph,
            f"{PARTY_PLACEHOLDER}and LIA",
            f"{PARTY_PLACEHOLDER} and LIA",
        )

    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    party_replacements += replace_in_runs(
                        paragraph,
                        original_placeholder,
                        PARTY_PLACEHOLDER,
                    )

    if party_replacements != 23 or school_replacements != 1:
        raise RuntimeError(
            "Unexpected school/district placeholder count: "
            f"party={party_replacements}, school={school_replacements}"
        )

    build_pricing_table(document)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT.resolve())


if __name__ == "__main__":
    build_template()
