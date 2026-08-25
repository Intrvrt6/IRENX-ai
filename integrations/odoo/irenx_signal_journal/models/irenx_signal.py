from odoo import api, fields, models


class IrenxSignal(models.Model):
    _name = "irenx.signal"
    _description = "IRENX Trading Signal"
    _order = "signal_time desc, id desc"

    name = fields.Char(required=True, index=True)
    symbol = fields.Char(required=True, index=True)
    status = fields.Selection(
        [("BUY", "BUY"), ("SELL", "SELL"), ("WAIT", "WAIT"), ("NO TRADE", "NO TRADE")],
        required=True,
        index=True,
    )
    bias = fields.Char()
    entry = fields.Float()
    sl = fields.Float()
    tp1 = fields.Float()
    tp2 = fields.Float()
    tp3 = fields.Float()
    confidence = fields.Float()
    timeframe = fields.Char()
    regime = fields.Char()
    liquidity = fields.Char()
    reflexivity = fields.Char()
    orochi = fields.Char()
    vmap = fields.Char()
    trigger = fields.Text()
    signal_time = fields.Datetime(required=True, index=True)
    source = fields.Char(default="IRENX")
    external_id = fields.Char(index=True)
    metadata_json = fields.Text()
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ("external_id_unique", "unique(external_id)", "An IRENX signal with this external ID already exists."),
    ]

    @api.model
    def create_from_irenx(self, values):
        """Idempotent ingestion method for IRENX JSON-2 integration."""
        external_id = values.get("external_id")
        if external_id:
            existing = self.search([("external_id", "=", external_id)], limit=1)
            if existing:
                existing.write(values)
                return existing.id
        record = self.create(values)
        return record.id
