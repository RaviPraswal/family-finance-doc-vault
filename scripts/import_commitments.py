"""Seed the commitments table from the Finnest tracker workbook (stdlib only, no Excel needed).

Reads 'MONTHLY EXPENSES' (plan rows) and 'Income Sources', prints SQL to stdout.
Rows whose name already exists for the tenant are skipped, so re-running never
overwrites edits made in the app. Chit B/C payment schedules ARE replaced from the
workbook's chit sheets, since those sheets record which cycles are paid.

    python -I scripts/import_commitments.py "<workbook.xlsx>" <user-email> | docker exec -i finnest_db psql -U finnest -d finnest_db
"""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def read_sheet(path, name):
    z = zipfile.ZipFile(path)
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            strings.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    for s in ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets', NS):
        if s.get('name') != name:
            continue
        target = rels[s.get('{%s}id' % NS['r'])].lstrip('/')
        target = target if target.startswith('xl/') else 'xl/' + target
        rows = {}
        for row in ET.fromstring(z.read(target)).find('m:sheetData', NS):
            for c in row:
                v = c.find('m:v', NS)
                if v is None:
                    continue
                val = strings[int(v.text)] if c.get('t') == 's' else v.text
                rows.setdefault(int(row.get('r')), {})[''.join(ch for ch in c.get('r') if ch.isalpha())] = val
        return rows
    raise SystemExit(f"Sheet '{name}' not found")


def q(s):
    return "NULL" if s is None or s == '' else "'" + str(s).replace("'", "''") + "'"


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def classify(item, category, freq):
    """Map a MONTHLY EXPENSES row to (group, frequency, interval_months, link). Living mirrors the sheet's H22."""
    lc_item, lc_cat = item.lower(), (category or '').lower()
    if 'gullak' in lc_item:
        return 'PAUSABLE', 'DAILY', None, None
    if 'emi' in lc_cat or 'loan' in lc_cat:
        return 'MUST_PAY', 'MONTHLY', None, 'loan'
    if lc_cat == 'chit':
        return 'MUST_PAY', 'MONTHLY', None, 'chit:' + ('B' if 'fund b' in lc_item else 'C')
    if 'electric' in lc_item:
        return 'LIVING', 'EVERY_N_MONTHS', 2, None
    if 'milk' in lc_item or (freq or '').lower() == 'daily':
        return 'LIVING', 'DAILY', None, None
    if lc_cat in ('fuel', 'grocery', 'milk') or 'mobile' in lc_item:
        return 'LIVING', 'MONTHLY', None, None
    return 'MUST_PAY', 'MONTHLY', None, None


def main(path, email):
    tenant = f"(SELECT tenant_id FROM users WHERE email = {q(email)})"
    user = f"(SELECT id FROM users WHERE email = {q(email)})"
    # Chit B started Oct 2025, Chit C Jul 2026 on the workbook's chit sheets; match on that start month.
    chit = {'B': "(SELECT id FROM chit_funds WHERE tenant_id = {t} AND to_char(start_date,'YYYY-MM') = '2025-10' LIMIT 1)",
            'C': "(SELECT id FROM chit_funds WHERE tenant_id = {t} AND to_char(start_date,'YYYY-MM') = '2026-07' LIMIT 1)"}
    loan = "(SELECT id FROM loans WHERE tenant_id = {t} AND lower(lender_name) LIKE 'indusind%' LIMIT 1)"

    out = ["BEGIN;"]
    # The chit sheets are the source of truth for which cycles are paid; replace the stored schedule.
    for key, sheet in (('B', 'Chit Fund B (Active)'), ('C', 'Chit Fund C (Active)')):
        rows = read_sheet(path, sheet)
        schedule = []
        for r in range(4, 24):
            row = rows.get(r, {})
            if not row.get('C'):
                continue
            schedule.append({'srNo': int(num(row['A'])), 'monthCycle': row.get('B'),
                             'calendarMonth': row['C'], 'calendarYear': int(num(row['D'])),
                             'actualAmount': num(row.get('E')) or 0, 'chitAmountAllocated': num(row.get('F')) or 0,
                             'status': row.get('H')})
        pending = sum(1 for s in schedule if s['status'] == 'Open / Pending')
        out.append(f"UPDATE chit_funds SET payment_schedule = {q(json.dumps(schedule))}, pending_installments = {pending}, "
                   f"updated_at = now() WHERE id = {chit[key].format(t=tenant)};")

    plan = read_sheet(path, 'MONTHLY EXPENSES')
    for r in range(5, 19):
        row = plan.get(r, {})
        item = row.get('B')
        if not item:
            continue
        group, freq, interval, link = classify(item, row.get('C'), row.get('E'))
        amount = num(row.get('D'))
        if 'silver' in item.lower() and freq == 'DAILY':
            amount = 100.0  # sheet stores the monthly figure (3000) for silver; daily base rate is 100
        if 'gold' in item.lower() and freq == 'DAILY':
            amount = 120.0  # Digital Gold sheet: effective daily SIP after 20% step-up
        link_loan = loan.format(t=tenant) if link == 'loan' else 'NULL'
        link_chit = chit[link[-1]].format(t=tenant) if link and link.startswith('chit') else 'NULL'
        start = "'2026-09-01'" if freq == 'EVERY_N_MONTHS' else 'NULL'  # bill last came in Sep (J12 = NO in Oct)
        active = 'true' if (row.get('G') or 'ACTIVE').upper() == 'ACTIVE' else 'false'
        due = int(num(row['F'])) if num(row.get('F')) else None
        out.append(_insert(tenant, user, item, group, row.get('C'), amount, freq, interval, due, start,
                           active, link_loan, link_chit, row.get('J')))

    income = read_sheet(path, 'Income Sources')
    for r in range(5, 31):
        row = income.get(r, {})
        if not row.get('A') or (row.get('C') or '').lower() != 'monthly':
            continue
        out.append(_insert(tenant, user, row['A'], 'INCOME', 'Income', num(row.get('D')), 'MONTHLY',
                           None, None, 'NULL', 'true', 'NULL', 'NULL', None))
    out.append("COMMIT;")
    sys.stdout.reconfigure(encoding='utf-8')  # Windows consoles default to cp1252; psql expects UTF-8
    print('\n'.join(out))


def _insert(tenant, user, name, group, category, amount, freq, interval, due, start, active, loan, chit, notes):
    return (
        "INSERT INTO commitments (id, created_at, updated_at, tenant_id, user_id, name, commitment_group, category, "
        "amount, frequency, interval_months, due_day, start_date, active, linked_loan_id, linked_chit_fund_id, notes) "
        f"SELECT gen_random_uuid(), now(), now(), {tenant}, {user}, {q(name)}, {q(group)}, {q(category)}, "
        f"{'NULL' if amount is None else amount}, {q(freq)}, {interval or 'NULL'}, {due or 'NULL'}, {start}, {active}, "
        f"{loan}, {chit}, {q(notes)} "
        f"WHERE NOT EXISTS (SELECT 1 FROM commitments WHERE tenant_id = {tenant} AND name = {q(name)});"
    )


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
