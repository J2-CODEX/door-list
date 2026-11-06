import AppKit
import PDFKit
import CoreGraphics

let W: CGFloat = 1191, H: CGFloat = 842
let base = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let out = base.appendingPathComponent("output/pdf/door-list-guia-base-de-datos.pdf")
let green = NSColor(calibratedRed: 0.094, green: 0.216, blue: 0.173, alpha: 1)
let muted = NSColor(calibratedRed: 0.35, green: 0.41, blue: 0.38, alpha: 1)
let lime = NSColor(calibratedRed: 0.847, green: 0.91, blue: 0.643, alpha: 1)
let cream = NSColor(calibratedRed: 0.965, green: 0.961, blue: 0.941, alpha: 1)
let border = NSColor(calibratedWhite: 0.82, alpha: 1)
let pale = NSColor(calibratedRed: 0.915, green: 0.937, blue: 0.88, alpha: 1)
var box = CGRect(x: 0, y: 0, width: W, height: H)
let ctx = CGContext(out as CFURL, mediaBox: &box, [kCGPDFContextTitle: "Door List | Guía de la base de datos", kCGPDFContextAuthor: "Door List"] as CFDictionary)!
func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ size: CGFloat = 15, _ bold: Bool = false, _ color: NSColor? = nil) {
    let style = NSMutableParagraphStyle(); style.lineSpacing = 4
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: bold ? .semibold : .regular), .foregroundColor: color ?? green, .paragraphStyle: style]
    let str = NSAttributedString(string: value, attributes: attrs)
    let rect = str.boundingRect(with: NSSize(width: width, height: 2000), options: [.usesLineFragmentOrigin, .usesFontLeading])
    str.draw(in: CGRect(x: x, y: y, width: width, height: ceil(rect.height) + 4))
}
func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ fill: NSColor, _ stroke: NSColor? = nil, _ radius: CGFloat = 12) {
    let p = NSBezierPath(roundedRect: CGRect(x:x,y:y,width:w,height:h), xRadius:radius, yRadius:radius)
    fill.setFill(); p.fill(); if let s = stroke { s.setStroke(); p.lineWidth = 1; p.stroke() }
}
func path(_ points: [(CGFloat,CGFloat)], _ color: NSColor = green, _ thickness: CGFloat = 1.5) {
    ctx.setStrokeColor(color.cgColor); ctx.setLineWidth(thickness); ctx.beginPath(); ctx.move(to: CGPoint(x:points[0].0,y:points[0].1)); for p in points.dropFirst() { ctx.addLine(to: CGPoint(x:p.0,y:p.1)) }; ctx.strokePath()
}
func page(_ n: Int, _ title: String, _ subtitle: String) {
    ctx.beginPDFPage(nil); ctx.saveGState(); ctx.translateBy(x:0,y:H); ctx.scaleBy(x:1,y:-1)
    NSGraphicsContext.current = NSGraphicsContext(cgContext:ctx, flipped:true)
    rect(0,0,W,H,cream,nil,0)
    text("door list.",40,25,200,22,true)
    text("GUÍA DE REFERENCIA  /  BASE DE DATOS",740,32,410,12,true,muted)
    path([(40,65),(1151,65)],border,1)
    text(title,40,85,1100,32,true)
    text(subtitle,40,132,1100,15,false,muted)
    path([(40,795),(1151,795)],border,1)
    text("Modelo según las migraciones del repositorio · 06 NOV 2026 · Sin consulta adicional a la base de datos",40,808,1000,11,false,muted)
    text(String(format:"%02d / 03",n),1085,807,80,12,true)
}
func end() { NSGraphicsContext.current = nil; ctx.restoreGState(); ctx.endPDFPage() }
func entity(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ title: String, _ subtitle: String, _ rows: [(String,String,String)]) {
    let h: CGFloat = 77 + CGFloat(rows.count)*26
    rect(x,y,w,h,.white,border)
    rect(x,y,w,65,green,nil,10)
    rect(x,y+45,w,20,green,nil,0)
    text(title,x+16,y+10,w-30,20,true,.white)
    text(subtitle,x+16,y+39,w-30,11,false,lime)
    for (i,r) in rows.enumerated() {
        let yy = y+76+CGFloat(i)*26
        if r.0 != "" { rect(x+12,yy-1,32,19,r.0 == "PK" ? lime : pale,nil,4); text(r.0,x+16,yy,30,10,true) }
        text(r.1,x+52,yy,w-150,13,true)
        text(r.2,x+w-96,yy,88,11,false,muted)
    }
}
// Crow's foot: horizontal parent to child, parent exactly one, child zero-many.
func horizontal(_ x1: CGFloat, _ x2: CGFloat, _ y: CGFloat) {
    path([(x1,y),(x2,y)])
    path([(x1+9,y-7),(x1+9,y+7)]);path([(x1+15,y-7),(x1+15,y+7)])
    path([(x2-14,y),(x2,y-8)]);path([(x2-14,y),(x2,y+8)])
    let p=NSBezierPath(ovalIn:CGRect(x:x2-27,y:y-4,width:8,height:8)); cream.setFill();p.fill();green.setStroke();p.stroke()
}
func block(_ x: CGFloat,_ y: CGFloat,_ w: CGFloat,_ number: String,_ title:String,_ body:String,_ h:CGFloat=122) {
    rect(x,y,w,h,.white,border)
    rect(x+16,y+18,30,28,lime,nil,6);text(number,x+21,y+22,30,12,true)
    text(title,x+58,y+17,w-76,18,true)
    text(body,x+18,y+56,w-36,14,false,muted)
}

page(1,"Mapa de entidades y relaciones","Un organizador crea eventos; cada evento ofrece entradas y recibe registros de asistentes.")
entity(40,212,285,"auth.users","Administrada por Supabase Auth",[("PK","id","uuid")])
entity(410,184,330,"public.events","Un evento pertenece a un organizador",[("PK","id","uuid"),("FK","owner_id","uuid"),("","title","text"),("","description","text"),("","starts_at","timestamptz"),("","venue","text"),("","status","event_status"),("","capacity","integer"),("","created_at","timestamptz")])
entity(826,184,325,"public.ticket_types","Tipos de entrada de un evento",[("PK","id","uuid"),("FK","event_id","uuid"),("","name","text"),("","capacity","integer"),("","created_at","timestamptz")])
entity(826,488,325,"public.registrations","Una fila = una plaza ocupada",[("PK","id","uuid"),("FK","event_id","uuid"),("FK","ticket_type_id","uuid"),("","name","text"),("","email","text"),("","created_at","timestamptz")])
horizontal(325,410,255);text("organiza",333,228,75,11,true)
horizontal(740,826,255);text("ofrece",755,228,70,11,true)
path([(989,391),(989,488)]);path([(982,402),(996,402)]);path([(982,408),(996,408)])
path([(989,474),(981,488)]);path([(989,474),(997,488)])
let circle=NSBezierPath(ovalIn:CGRect(x:985,y:459,width:8,height:8));cream.setFill();circle.fill();green.setStroke();circle.stroke()
text("asigna una plaza",1006,422,140,12,true)
text("FK compuesta",1006,444,140,11,false,muted)
path([(740,443),(778,443),(778,595),(826,595)])
path([(750,436),(750,450)]);path([(756,436),(756,450)])
path([(812,595),(826,587)]);path([(812,595),(826,603)])
let circ2=NSBezierPath(ovalIn:CGRect(x:799,y:591,width:8,height:8));cream.setFill();circ2.fill();green.setStroke();circ2.stroke()
text("recibe",765,608,60,11,true)
rect(40,355,285,124,pale)
text("El asistente no necesita cuenta",56,372,253,17,true)
text("Su nombre y email se guardan en registrations. auth.users representa al organizador, no al asistente.",56,410,253,14)
rect(40,540,690,206,.white,border)
text("Cómo leer el diagrama",60,557,650,19,true)
text("PK  Clave primaria: identifica una fila de forma única.\nFK  Clave foránea: vincula una fila con otra tabla.\n||   Exactamente uno.     Círculo + bifurcación: cero o muchos.",60,592,650,14)
text("Todos los campos mostrados son NOT NULL. Solo se presenta id de auth.users; su esquema interno queda fuera de esta guía.",60,688,640,13,false,muted)
text("Las relaciones conectan entidades; el detalle exacto de las FK está en la página 2.",40,764,1080,12,false,muted)
end()

page(2,"Claves, restricciones y reglas de aforo","La integridad se protege con claves, CHECK, restricciones UNIQUE y triggers en PostgreSQL.")
text("01  Relaciones y eliminación",40,186,1100,21,true)
let rels:[(String,String,String)] = [
("events.owner_id → auth.users.id","RESTRICT","No permite eliminar un organizador con eventos."),
("ticket_types.event_id → events.id","CASCADE","Eliminar un evento elimina sus entradas, si no hay registros."),
("registrations.event_id → events.id","RESTRICT","Un evento con registros no se puede eliminar."),
("registrations(event_id, ticket_type_id) → ticket_types(event_id, id)","RESTRICT","FK compuesta: la entrada debe pertenecer al evento; protege entradas con registros.")]
for (i,r) in rels.enumerated() { let y:CGFloat=224+CGFloat(i)*66;rect(40,y,1111,61,i%2==0 ? .white:pale,nil,5);text(r.0,54,y+10,710,13,true);text(r.1,1009,y+10,130,12,true);text(r.2,54,y+33,1000,12,false,muted) }
text("02  Identidad y datos obligatorios",40,510,535,20,true)
text("• PK: UUID generado automáticamente para cada fila pública.\n• UNIQUE(event_id, email): un registro por email y evento.\n• UNIQUE(event_id, id) en entradas: destino de la FK compuesta.\n• Estado: enum draft | published; inicia en draft.\n• Textos de evento y nombre de entrada: no vacíos ni solo espacios.\n• Nombre del asistente: entre 1 y 200 caracteres tras trim.\n• Email: minúsculas, trim, máximo 254 y formato básico válido.\n• created_at: fecha de creación automática con now().",40,548,530,14)
text("03  Aforo y disponibilidad",621,510,530,20,true)
text("• Capacidad de evento y entrada: entero mayor que cero.\n• La suma de capacidades de entradas no supera la del evento.\n• El aforo del evento no baja de las plazas ya asignadas.\n• Una entrada no baja de sus registros existentes.\n• Una entrada con registros no puede cambiar de evento.",621,548,530,14)
rect(621,692,530,75,green)
text("Cupos = capacidad del tipo − registros del tipo",637,705,496,16,true,.white)
text("Ejemplo: General 80 − 25 registros = 55 cupos disponibles.",637,738,496,12,false,lime)
end()

page(3,"Flujo de registro y acceso a los datos","La consulta informa disponibilidad; la transacción de registro toma la decisión final.")
let cols:[CGFloat] = [40,420,800]
block(cols[0],186,351,"1","Preparar el evento","El organizador crea events, distribuye el aforo en ticket_types y publica el evento.")
block(cols[1],186,351,"2","Consultar disponibilidad","get_public_registration_event devuelve datos públicos y cupos agregados. Sin nombres ni emails.")
block(cols[2],186,351,"3","Completar el formulario","El asistente elige una entrada e ingresa nombre y email. Se valida en cliente y servidor.")
for x in [CGFloat(397),CGFloat(777)] { text("→",x,229,24,20,true) }
rect(40,331,1111,169,green)
text("4   register_attendee: una sola transacción",60,349,1070,22,true,.white)
text("Bloquear la fila del evento → validar publicación y fecha → comprobar duplicado → verificar entrada y cupo → insertar",60,395,1060,15,false,.white)
text("Si una validación falla: devuelve el motivo y no crea el registro. Si tiene éxito: una nueva fila ocupa una plaza.",60,432,1060,14,false,lime)
text("El bloqueo serializa registros del mismo evento y evita que dos solicitudes consuman la última plaza.",60,464,1060,13,false,lime)
text("Vigencia: fecha del evento ≥ hoy en America/Guayaquil. Incluye todo el día, aunque ya haya pasado la hora de inicio.",40,515,1110,14,true)
text("Permisos y privacidad (RLS)",40,560,535,20,true)
text("• Público: lee eventos y entradas publicados.\n• Organizador: administra solo sus eventos y entradas.\n• Registros: sin lectura pública ni inserción directa para anon o authenticated.\n• Propietario: puede leer registros de sus propios eventos.\n• Las dos RPC públicas usan SECURITY DEFINER y search_path vacío; solo exponen la operación prevista.",40,596,535,14)
text("Índices y notas de referencia",621,560,530,20,true)
text("Índices: events(owner_id); events(starts_at) parcial para publicados; ticket_types(event_id); registrations(ticket_type_id). PK y UNIQUE también crean índices.\n\nLa política general de lectura de publicados no filtra fechas pasadas. Las RPC de registro sí aplican la vigencia. No existe una columna de cupos restantes.",621,596,530,14)
text("Fuentes: supabase/migrations/20261104120000_events_and_ticket_types.sql · 20261104130000_event_capacity.sql · 20261106120000_public_registration.sql",40,763,1111,10,false,muted)
end()
ctx.closePDF()
if let doc=PDFDocument(url:out) {
 for i in 0..<doc.pageCount {
  let page=doc.page(at:i)!
  let image=page.thumbnail(of:NSSize(width:1787,height:1263),for:.mediaBox)
  let bitmap=NSBitmapImageRep(data:image.tiffRepresentation!)!
  try bitmap.representation(using:.png,properties:[:])!.write(to:base.appendingPathComponent("tmp/pdfs/er-page-\(i+1).png"))
 }
 print("PDF creado: \(doc.pageCount) páginas")
 for i in 0..<doc.pageCount { print("Página \(i+1): \(doc.page(at:i)?.string?.count ?? 0) caracteres extraíbles") }
}
