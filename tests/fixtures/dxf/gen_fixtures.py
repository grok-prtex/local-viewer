import ezdxf
from ezdxf.enums import TextEntityAlignment as A
doc = ezdxf.new('R2010', setup=True)
msp = doc.modelspace()
doc.layers.add('FRAME', color=7); doc.layers.add('DIM', color=3); doc.layers.add('TXT', color=2)
msp.add_lwpolyline([(0,0),(120,0),(120,60),(0,60)], close=True)
msp.add_circle((60,30), 15)
# title block as block with attdefs
tb = doc.blocks.new('TITLE')
tb.add_lwpolyline([(0,0),(180,0),(180,40),(0,40)], close=True)
tb.add_line((0,20),(180,20)); tb.add_line((60,0),(60,40))
tb.add_text('図番', height=4).set_placement((3,33))
tb.add_text('名称', height=4).set_placement((3,13))
tb.add_attdef('DWGNO', (63,26), dxfattribs={'height':6}).set_placement((63,26))
tb.add_attdef('TITLE', (63,6), dxfattribs={'height':6}).set_placement((63,6))
ins = msp.add_blockref('TITLE', (-30,-60), dxfattribs={'layer':'FRAME'})
ins.add_auto_attribs({'DWGNO':'LV-2026-001', 'TITLE':'ベースプレート 組立図'})
# texts alignment
msp.add_text('左下 baseline', height=3, dxfattribs={'layer':'TXT'}).set_placement((0,70))
msp.add_text('中央 CENTER', height=3, dxfattribs={'layer':'TXT'}).set_placement((60,70), align=A.MIDDLE_CENTER)
msp.add_text('右寄せ RIGHT', height=3, dxfattribs={'layer':'TXT'}).set_placement((120,70), align=A.TOP_RIGHT)
msp.add_text('回転90°', height=3, dxfattribs={'layer':'TXT','rotation':90}).set_placement((130,0))
msp.add_text('%%c30 %%p0.1 45%%d', height=3, dxfattribs={'layer':'TXT'}).set_placement((0,80))
msp.add_mtext(r'{\fMS Gothic|b1;注記}\P1. 面取り C0.5\P2. \U+2300 10 穴 \S+0.1^-0.0; \C1;赤\C7; 終', dxfattribs={'char_height':3,'layer':'TXT','insert':(140,60),'attachment_point':1,'width':60})
# dimensions
d = msp.add_linear_dim(base=(0,-10), p1=(0,0), p2=(120,0), dimstyle='EZDXF', override={'dimlfac':1,'dimtxt':2.5,'dimasz':2.5}, dxfattribs={'layer':'DIM'}); d.render()
d = msp.add_linear_dim(base=(-10,0), p1=(0,0), p2=(0,60), angle=90, dimstyle='EZDXF', override={'dimlfac':1,'dimtxt':2.5,'dimasz':2.5}, dxfattribs={'layer':'DIM'}); d.render()
d = msp.add_radius_dim(center=(60,30), radius=15, angle=45, dimstyle='EZDXF', override={'dimlfac':1,'dimtxt':2.5,'dimasz':2.5}, dxfattribs={'layer':'DIM'}); d.render()
# leader & mleader
msp.add_leader([(75,40),(90,50),(100,50)], dxfattribs={'layer':'DIM'})
msp.add_text('リーダー注記', height=3, dxfattribs={'layer':'DIM'}).set_placement((101,50))
ml = msp.add_multileader_mtext('Standard')
ml.set_content('MLEADER 引出し', char_height=3)
ml.add_leader_line(ezdxf.render.mleader.ConnectionSide.left, [ezdxf.math.Vec2(110,20)])
ml.build(insert=ezdxf.math.Vec2(140,30))
# paper space layout with viewport + title
ps = doc.layouts.get('Layout1')
ps.add_viewport(center=(140,110), size=(240,160), view_center_point=(60,20), view_height=160)
ps.add_text('レイアウト1 ペーパー空間', height=5).set_placement((20,200))
ps.add_blockref('TITLE', (230,10)).add_auto_attribs({'DWGNO':'PS-01','TITLE':'レイアウト図枠'})
doc.saveas('jp-titleblock.dxf')

# dimension without block: strip geometry block reference
doc2 = ezdxf.new('R2010', setup=True); m2 = doc2.modelspace()
m2.add_line((0,0),(100,0)); m2.add_line((0,0),(0,50))
m2.add_linear_dim(base=(0,-10), p1=(0,0), p2=(100,0), dimstyle='EZDXF', override={'dimlfac':1,'dimtxt':2.5,'dimasz':2.5})  # not rendered
m2.add_linear_dim(base=(-10,0), p1=(0,0), p2=(0,50), angle=90, dimstyle='EZDXF', override={'dimlfac':1,'dimtxt':2.5,'dimasz':2.5})
doc2.saveas('dim-noblock.dxf')

doc3 = ezdxf.new('R12'); doc3.header['$DWGCODEPAGE']='ANSI_932'; m3=doc3.modelspace()
m3.add_line((0,0),(100,0)); m3.add_text('シフトJIS 古いDXF 図面', height=5).set_placement((0,5))
doc3.saveas('sjis-r12.dxf', encoding='cp932')
