// 自動生成（scripts/prc/gen.py）。編集しないでください。
// 元データ: prc-rs の prc.json（MIT License, Copyright (c) 2025,2026 Kristóf Ralovich）
/* eslint-disable */
// @ts-nocheck
import { B } from './bits';

export function r_Name(r, ctx) {
  const o = { _t: "Name" };
  { o.same_name = B.Boolean(r); }
  if (!o.same_name) { o.name = B.String(r); ctx.current_name = o.name; }
  return o;
}
export function r_AttributeEntry(r, ctx) {
  const o = { _t: "AttributeEntry" };
  { o.flag = B.Boolean(r); }
  if (!!o.flag) { o.integer_title = B.UnsignedInteger(r); }
  if (!o.flag) { o.string_title = B.String(r); }
  return o;
}
export function r_AttributeKeyValue(r, ctx) {
  const o = { _t: "AttributeKeyValue" };
  { o.title = r_AttributeEntry(r, ctx); }
  { o.type_ = B.UnsignedInteger(r); }
  if (o.type_ == 1) { o.valuei = B.Integer(r); }
  if (o.type_ == 2) { o.valued = B.Double(r); }
  if (o.type_ == 3) { o.valuet = B.Integer(r); }
  if (o.type_ == 4) { o.values = B.String(r); }
  if (o.type_ == 5) { o.value_msp = B.Integer(r); }
  if (o.type_ == 5) { o.value_lsp = B.UnsignedInteger(r); }
  return o;
}
export function r_PRC_TYPE_MISC_Attribute(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_Attribute" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 201) throw new Error('PRC_TYPE_MISC_Attribute.id: expected 201 got ' + o.id); }
  { o.attribute_title = r_AttributeEntry(r, ctx); }
  { o.number_of_attributes = B.UnsignedInteger(r); }
  { const n = o.number_of_attributes; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_AttributeKeyValue(r, ctx); o.attributes = a; }
  ctx.se(r, 201);
  return o;
}
export function r_AttributeData(r, ctx) {
  const o = { _t: "AttributeData" };
  { o.attribute_count = B.UnsignedInteger(r); }
  { const n = o.attribute_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_Attribute(r, ctx); o.attributes = a; }
  return o;
}
export function r_ContentPRCBase(r, ctx) {
  const o = { _t: "ContentPRCBase" };
  { o.attribute_data = r_AttributeData(r, ctx); }
  { o.entity_name = r_Name(r, ctx); }
  return o;
}
export function r_ElementGraphicsBehavior(r, ctx) {
  const o = { _t: "ElementGraphicsBehavior" };
  { o.use_context = B.Boolean(r); }
  if (!o.use_context) { o.biased_layer_index = B.UnsignedInteger(r); ctx.layer_index = o.biased_layer_index + 1; }
  if (!o.use_context) { o.biased_index_of_line_style = B.UnsignedInteger(r); ctx.index_of_line_style = o.biased_index_of_line_style + 1; }
  if (!o.use_context) { o.behavior_bit_field = B.UnsignedShort(r); ctx.behavior_bit_field = o.behavior_bit_field; }
  return o;
}
export function r_GeometrySummary(r, ctx) {
  const o = { _t: "GeometrySummary" };
  { o.number_of_bodies = B.UnsignedInteger(r); }
  { const n = o.number_of_bodies; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_BodyInformation(r, ctx); o.bodies = a; }
  return o;
}
export function r_BodyInformation(r, ctx) {
  const o = { _t: "BodyInformation" };
  { o.body_serial_type = B.UnsignedInteger(r); }
  if (o.body_serial_type == 156 || o.body_serial_type == 155 || o.body_serial_type == 173) { o.tolerance = B.Double(r); }
  return o;
}
export function r_ContextGraphics(r, ctx) {
  const o = { _t: "ContextGraphics" };
  { o.number_of_treat_type = B.UnsignedInteger(r); }
  { const n = o.number_of_treat_type; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_GraphicsInformation(r, ctx); o.treat_types = a; }
  return o;
}
export function r_GraphicsInformation(r, ctx) {
  const o = { _t: "GraphicsInformation" };
  { o.element_type = B.UnsignedInteger(r); }
  { o.number_of_element = B.UnsignedInteger(r); }
  { const n = o.number_of_element; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ElementInformation(r, ctx); o.treat_types = a; }
  return o;
}
export function r_ElementInformation(r, ctx) {
  const o = { _t: "ElementInformation" };
  { o.has_graphics = B.Boolean(r); }
  if (!!o.has_graphics) { o.graphic_behavior = r_ElementGraphicsBehavior(r, ctx); }
  return o;
}
export function r_ExtraGeometry(r, ctx) {
  const o = { _t: "ExtraGeometry" };
  { o.summary = r_GeometrySummary(r, ctx); }
  { o.context_data = r_ContextGraphics(r, ctx); }
  return o;
}
export function r_PRC_TYPE_ASM_FileStructureExtraGeometry(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_FileStructureExtraGeometry" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 307) throw new Error('PRC_TYPE_ASM_FileStructureExtraGeometry.id: expected 307 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.extra_geom_count = B.UnsignedInteger(r); }
  { const n = o.extra_geom_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ExtraGeometry(r, ctx); o.extra_geom = a; }
  ctx.se(r, 307);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_Entity_schema_definition(r, ctx) {
  const o = { _t: "Entity_schema_definition" };
  { o.entity_type = B.UnsignedInteger(r); }
  { o.token_count = B.UnsignedInteger(r); }
  { const n = o.token_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.schema_tokens = a; }
  return o;
}
export function r_Schema(r, ctx) {
  const o = { _t: "Schema" };
  { o.schema_count = B.UnsignedInteger(r); }
  { const n = o.schema_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Entity_schema_definition(r, ctx); o.schemas = a; }
  return o;
}
export function r_UniqueId(r, ctx) {
  const o = { _t: "UniqueId" };
  { o.unique_id0 = B.UnsignedInteger(r); }
  { o.unique_id1 = B.UnsignedInteger(r); }
  { o.unique_id2 = B.UnsignedInteger(r); }
  { o.unique_id3 = B.UnsignedInteger(r); }
  return o;
}
export function r_FontKey(r, ctx) {
  const o = { _t: "FontKey" };
  { o.font_size = B.UnsignedInteger(r); }
  { o.font_attributes = B.Character(r); }
  return o;
}
export function r_FontKeysSameFont(r, ctx) {
  const o = { _t: "FontKeysSameFont" };
  { o.font_name = B.String(r); }
  { o.character_set = B.UnsignedInteger(r); }
  { o.key_count = B.UnsignedInteger(r); }
  { const n = o.key_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_FontKey(r, ctx); o.font_key_list = a; }
  return o;
}
export function r_MarkupSerializationHelper(r, ctx) {
  const o = { _t: "MarkupSerializationHelper" };
  { o.default_font_family_name = B.String(r); }
  { o.font_keys_count = B.UnsignedInteger(r); }
  { const n = o.font_keys_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_FontKeysSameFont(r, ctx); o.font_keys_of_font = a; }
  return o;
}
export function r_RgbColor(r, ctx) {
  const o = { _t: "RgbColor" };
  { o.red = B.Double(r); }
  { o.green = B.Double(r); }
  { o.blue = B.Double(r); }
  return o;
}
export function r_PRC_TYPE_GRAPH_Picture(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_Picture" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 703) throw new Error('PRC_TYPE_GRAPH_Picture.id: expected 703 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.format = B.UnsignedInteger(r); }
  { o.biased_uncompressed_file_index = B.UnsignedInteger(r); }
  { o.pixel_width = B.UnsignedInteger(r); }
  { o.pixel_height = B.UnsignedInteger(r); }
  ctx.se(r, 703);
  return o;
}
export function r_Vector2D(r, ctx) {
  const o = { _t: "Vector2D" };
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  return o;
}
export function r_Vector3D(r, ctx) {
  const o = { _t: "Vector3D" };
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  { o.z = B.Double(r); }
  return o;
}
export function r_Transformation2D(r, ctx) {
  const o = { _t: "Transformation2D" };
  { o.behavior = B.Character(r); }
  if ((o.behavior & 1) != 0) { o.translation = r_Vector2D(r, ctx); }
  if ((o.behavior & 32) != 0) { const a = []; for (let i = 0; i < 2; i++) a.push(r_Vector2D(r, ctx)); o.non_ortho_matrix = a; }
  if (((o.behavior & 2) != 0) && ((o.behavior & 32) == 0)) { o.rotation = r_Vector2D(r, ctx); }
  if ((o.behavior & 16) != 0) { o.non_uniform_scale = r_Vector2D(r, ctx); }
  if ((o.behavior & 8) != 0) { o.scale = B.Double(r); }
  if ((o.behavior & 64) != 0) { const a = []; for (let i = 0; i < 3; i++) a.push(B.Double(r)); o.homogeneous = a; }
  return o;
}
export function r_Transformation2DWithBit(r, ctx) {
  const o = { _t: "Transformation2DWithBit" };
  { o.has_transformation = B.Boolean(r); }
  if (!!o.has_transformation) { o.transformation = r_Transformation2D(r, ctx); }
  return o;
}
export function r_Transformation3D(r, ctx) {
  const o = { _t: "Transformation3D" };
  { o.behavior = B.Character(r); }
  if ((o.behavior & 1) != 0) { o.translation = r_Vector3D(r, ctx); }
  if ((o.behavior & 32) != 0) { const a = []; for (let i = 0; i < 3; i++) a.push(r_Vector3D(r, ctx)); o.non_ortho_matrix = a; }
  if (((o.behavior & 2) != 0) && ((o.behavior& 32) == 0)) { const a = []; for (let i = 0; i < 2; i++) a.push(r_Vector3D(r, ctx)); o.rotation = a; }
  if ((o.behavior & 16) != 0) { o.non_uniform_scale = r_Vector3D(r, ctx); }
  if ((o.behavior & 8) != 0) { o.scale = B.Double(r); }
  if ((o.behavior & 64) != 0) { const a = []; for (let i = 0; i < 4; i++) a.push(B.Double(r)); o.homogeneous = a; }
  return o;
}
export function r_Transformation3DWithBit(r, ctx) {
  const o = { _t: "Transformation3DWithBit" };
  { o.has_transformation = B.Boolean(r); }
  if (!!o.has_transformation) { o.transformation = r_Transformation3D(r, ctx); }
  return o;
}
export function r_PRC_TYPE_MISC_CartesianTransformation(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_CartesianTransformation" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 202) throw new Error('PRC_TYPE_MISC_CartesianTransformation.id: expected 202 got ' + o.id); }
  { o.transform = r_Transformation3D(r, ctx); }
  ctx.se(r, 202);
  return o;
}
export function r_PRC_TYPE_MISC_GeneralTransformation(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_GeneralTransformation" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 207) throw new Error('PRC_TYPE_MISC_GeneralTransformation.id: expected 207 got ' + o.id); }
  { const a = []; for (let i = 0; i < 16; i++) a.push(B.Double(r)); o.general_transform = a; }
  ctx.se(r, 207);
  return o;
}
export function r_PRC_TYPE_GRAPH_TextureTransformation(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_TextureTransformation" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 713) throw new Error('PRC_TYPE_GRAPH_TextureTransformation.id: expected 713 got ' + o.id); }
  { o.invert_s = B.Boolean(r); }
  { o.invert_t = B.Boolean(r); }
  { o.transform_2d = B.Boolean(r); }
  if (!!o.transform_2d) { o.transform = r_Transformation2D(r, ctx); }
  ctx.se(r, 713);
  return o;
}
export function r_ContentPRCRefBase(r, ctx) {
  const o = { _t: "ContentPRCRefBase" };
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.nonpersistent_id = B.UnsignedInteger(r); }
  { o.unique_id_cad = B.UnsignedInteger(r); }
  { o.unique_id = B.UnsignedInteger(r); }
  return o;
}
export function r_PRC_TYPE_GRAPH_TextureDefinition(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_TextureDefinition" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 712) throw new Error('PRC_TYPE_GRAPH_TextureDefinition.id: expected 712 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_picture_index = B.UnsignedInteger(r); }
  { o.texture_dimension = B.Character(r); }
  { o.texture_mapping_type = B.Integer(r); }
  if (o.texture_mapping_type == 3) { o.texture_mapping_operator = B.Integer(r); }
  if (o.texture_mapping_type == 3) { o.has_transformation = B.Boolean(r); }
  if (o.texture_mapping_type == 3 && !!o.has_transformation) { o.transformation = r_PRC_TYPE_MISC_CartesianTransformation(r, ctx); }
  { o.texture_mapping_attributes = B.UnsignedInteger(r); }
  { o.number_of_texture_mapping_attributes_intensities = B.UnsignedInteger(r); }
  if (o.number_of_texture_mapping_attributes_intensities != 0) { const n = o.number_of_texture_mapping_attributes_intensities; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.texture_mapping_attributes_intensities = a; }
  { o.number_of_texture_mapping_attributes_components = B.UnsignedInteger(r); }
  if (o.number_of_texture_mapping_attributes_components != 0) { const n = o.number_of_texture_mapping_attributes_components; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Character(r); o.texture_mapping_attributes_components = a; }
  { o.texture_function = B.Integer(r); }
  if (o.texture_function == 3) { const a = []; for (let i = 0; i < 4; i++) a.push(B.Double(r)); o.blend_src = a; }
  { o.blend_src_rgb = B.Integer(r); }
  if (o.blend_src_rgb != 0) { o.blend_dst_rgb = B.Integer(r); }
  { o.blend_src_alpha = B.Integer(r); }
  if (o.blend_src_alpha != 0) { o.blend_dst_alpha = B.Integer(r); }
  { o.texture_application_mode = B.Character(r); }
  if ((o.texture_application_mode & 2) != 0) { o.alpha_test = B.Integer(r); }
  if ((o.texture_application_mode & 2) != 0) { o.alpha_test_reference = B.Double(r); }
  { o.texture_wrapping_mode_s = B.Integer(r); }
  if (o.texture_dimension > 1) { o.texture_wrapping_mode_t = B.Integer(r); }
  if (o.texture_dimension > 2) { o.texture_wrapping_mode_r = B.Integer(r); }
  { o.has_texture_transformation = B.Boolean(r); }
  if (!!o.has_texture_transformation) { o.texture_transformation = r_PRC_TYPE_GRAPH_TextureTransformation(r, ctx); }
  ctx.se(r, 712);
  return o;
}
export function r_PRC_TYPE_GRAPH_Material(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_Material" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 702) throw new Error('PRC_TYPE_GRAPH_Material.id: expected 702 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_ambient_index = B.UnsignedInteger(r); }
  { o.biased_diffuse_index = B.UnsignedInteger(r); }
  { o.biased_emissive_index = B.UnsignedInteger(r); }
  { o.biased_specular_index = B.UnsignedInteger(r); }
  { o.shininess = B.Double(r); }
  { o.ambient_alpha = B.Double(r); }
  { o.diffuse_alpha = B.Double(r); }
  { o.emissive_alpha = B.Double(r); }
  { o.specular_alpha = B.Double(r); }
  ctx.se(r, 702);
  return o;
}
export function r_PRC_TYPE_GRAPH_TextureApplication(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_TextureApplication" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 711) throw new Error('PRC_TYPE_GRAPH_TextureApplication.id: expected 711 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_material_generic_index = B.UnsignedInteger(r); }
  { o.biased_texture_definition_index = B.UnsignedInteger(r); }
  { o.biased_next_texture_index = B.UnsignedInteger(r); }
  { o.biased_uv_coordinates_index = B.UnsignedInteger(r); }
  ctx.se(r, 711);
  return o;
}
export function r_Material(r, ctx) {
  const o = { _t: "Material" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 702: o.id = r_PRC_TYPE_GRAPH_Material(r, ctx); break;   case 711: o.id = r_PRC_TYPE_GRAPH_TextureApplication(r, ctx); break;   default: throw new Error('Material: unknown subtype ' + JSON.stringify(tid)); } }
  return o;
}
export function r_PRC_TYPE_GRAPH_LinePattern(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_LinePattern" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 721) throw new Error('PRC_TYPE_GRAPH_LinePattern.id: expected 721 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.number_of_elements = B.UnsignedInteger(r); }
  { const n = o.number_of_elements; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.length = a; }
  { o.start_offset = B.Double(r); }
  { o.scale = B.Boolean(r); }
  ctx.se(r, 721);
  return o;
}
export function r_PRC_TYPE_GRAPH_Style(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_Style" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 701) throw new Error('PRC_TYPE_GRAPH_Style.id: expected 701 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.line_width = B.Double(r); }
  { o.is_vpicture = B.Boolean(r); }
  { o.biased_pattern_index = B.UnsignedInteger(r); }
  { o.is_material = B.Boolean(r); }
  { o.biased_color_index = B.UnsignedInteger(r); }
  { o.is_transparency = B.Boolean(r); }
  if (!!o.is_transparency) { o.transparency = B.Character(r); }
  { o.is_rendering_parameters = B.Boolean(r); }
  if (!!o.is_rendering_parameters) { o.rendering_parameters = B.Character(r); }
  { o.is_rendering_parameters2 = B.Boolean(r); }
  if (!!o.is_rendering_parameters2) { o.rendering_parameters2 = B.Character(r); }
  { o.is_rendering_parameters3 = B.Boolean(r); }
  if (!!o.is_rendering_parameters3) { o.rendering_parameters3 = B.Character(r); }
  ctx.se(r, 701);
  return o;
}
export function r_PRC_TYPE_GRAPH_DottingPattern(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_DottingPattern" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 723) throw new Error('PRC_TYPE_GRAPH_DottingPattern.id: expected 723 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_next_pattern_index = B.UnsignedInteger(r); }
  { o.pitch = B.Double(r); }
  { o.is_offset = B.Boolean(r); }
  { o.biased_color_index = B.Integer(r); }
  ctx.se(r, 723);
  return o;
}
export function r_HatchingLine(r, ctx) {
  const o = { _t: "HatchingLine" };
  { o.start_point = r_Vector2D(r, ctx); }
  { o.end_point = r_Vector2D(r, ctx); }
  { o.angle = B.Double(r); }
  { o.biased_index_of_line_style = B.Integer(r); }
  return o;
}
export function r_PRC_TYPE_GRAPH_HatchingPattern(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_HatchingPattern" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 724) throw new Error('PRC_TYPE_GRAPH_HatchingPattern.id: expected 724 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_next_pattern_index = B.UnsignedInteger(r); }
  { o.number_of_hatching_lines = B.UnsignedInteger(r); }
  { const n = o.number_of_hatching_lines; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_HatchingLine(r, ctx); o.hatch = a; }
  ctx.se(r, 724);
  return o;
}
export function r_PRC_TYPE_GRAPH_SolidPattern(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_SolidPattern" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 725) throw new Error('PRC_TYPE_GRAPH_SolidPattern.id: expected 725 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_next_pattern_index = B.UnsignedInteger(r); }
  { o.is_material = B.Boolean(r); }
  if (!!o.is_material) { o.biased_material_index = B.UnsignedInteger(r); }
  if (!o.is_material) { o.biased_color_index = B.UnsignedInteger(r); }
  ctx.se(r, 725);
  return o;
}
export function r_ContentBaseTessData(r, ctx) {
  const o = { _t: "ContentBaseTessData" };
  { o.is_calculated = B.Boolean(r); }
  { o.number_of_coordinates = B.UnsignedInteger(r); }
  { const n = o.number_of_coordinates; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.coordinates = a; }
  return o;
}
export function r_PRC_TYPE_TESS_Markup(r, ctx) {
  const o = { _t: "PRC_TYPE_TESS_Markup" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 176) throw new Error('PRC_TYPE_TESS_Markup.id: expected 176 got ' + o.id); }
  { o.tessellation_coordinates = r_ContentBaseTessData(r, ctx); }
  { o.number_of_codes = B.UnsignedInteger(r); }
  { const n = o.number_of_codes; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.code_numbers = a; }
  { o.number_of_text_strings = B.UnsignedInteger(r); }
  { const n = o.number_of_text_strings; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.String(r); o.text_strings = a; }
  { o.tessellation_label = B.String(r); }
  { o.behavior = B.Character(r); }
  ctx.se(r, 176);
  return o;
}
export function r_PRC_TYPE_GRAPH_VPicturePattern(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_VPicturePattern" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 726) throw new Error('PRC_TYPE_GRAPH_VPicturePattern.id: expected 726 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_next_pattern_index = B.UnsignedInteger(r); }
  { const a = []; for (let i = 0; i < 2; i++) a.push(B.Double(r)); o.pattern_dimensions = a; }
  { o.markup = r_PRC_TYPE_TESS_Markup(r, ctx); }
  ctx.se(r, 726);
  return o;
}
export function r_PRC_TYPE_GRAPH_FillPattern(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_FillPattern" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 723: o.data = r_PRC_TYPE_GRAPH_DottingPattern(r, ctx); break;   case 724: o.data = r_PRC_TYPE_GRAPH_HatchingPattern(r, ctx); break;   case 725: o.data = r_PRC_TYPE_GRAPH_SolidPattern(r, ctx); break;   case 726: o.data = r_PRC_TYPE_GRAPH_VPicturePattern(r, ctx); break;   default: throw new Error('PRC_TYPE_GRAPH_FillPattern: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 722);
  return o;
}
export function r_GraphicsContent(r, ctx) {
  const o = { _t: "GraphicsContent" };
  { o.biased_layer_index = B.UnsignedInteger(r); }
  { o.biased_index_of_line_style = B.UnsignedInteger(r); }
  { o.behavior_bit_field = B.UnsignedShort(r); }
  return o;
}
export function r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx) {
  const o = { _t: "PRC_TYPE_ROOT_PRCBaseWithGraphics" };
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.same_graphics = B.Boolean(r); }
  if (!o.same_graphics) { o.graphics_content = r_GraphicsContent(r, ctx); }
  ctx.se(r, 2);
  return o;
}
export function r_RepresentationItemContent(r, ctx) {
  const o = { _t: "RepresentationItemContent" };
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.biased_index_local_coordinate_system = B.UnsignedInteger(r); }
  { o.biased_index_tessellation = B.UnsignedInteger(r); }
  return o;
}
export function r_PRC_TYPE_RI_CoordinateSystem(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_CoordinateSystem" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 240) throw new Error('PRC_TYPE_RI_CoordinateSystem.id: expected 240 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 207: o.transform = r_PRC_TYPE_MISC_GeneralTransformation(r, ctx); break;   case 202: o.transform = r_PRC_TYPE_MISC_CartesianTransformation(r, ctx); break;   default: throw new Error('PRC_TYPE_RI_CoordinateSystem: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 240);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_FileStructureInternalGlobalData(r, ctx) {
  const o = { _t: "FileStructureInternalGlobalData" };
  { o.tess_chord = B.Double(r); }
  { o.tess_angle = B.Double(r); }
  { o.serialize_help = r_MarkupSerializationHelper(r, ctx); }
  { o.color_count = B.UnsignedInteger(r); }
  { const n = o.color_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_RgbColor(r, ctx); o.colors = a; }
  { o.picture_count = B.UnsignedInteger(r); }
  { const n = o.picture_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_GRAPH_Picture(r, ctx); o.pictures = a; }
  { o.texture_count = B.UnsignedInteger(r); }
  { const n = o.texture_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_GRAPH_TextureDefinition(r, ctx); o.textures = a; }
  { o.material_count = B.UnsignedInteger(r); }
  { const n = o.material_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Material(r, ctx); o.materials = a; }
  { o.line_pattern_count = B.UnsignedInteger(r); }
  { const n = o.line_pattern_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_GRAPH_LinePattern(r, ctx); o.line_patterns = a; }
  { o.style_count = B.UnsignedInteger(r); }
  { const n = o.style_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_GRAPH_Style(r, ctx); o.styles = a; }
  { o.fill_count = B.UnsignedInteger(r); }
  { const n = o.fill_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_GRAPH_FillPattern(r, ctx); o.fills = a; }
  { o.ref_coord_count = B.UnsignedInteger(r); }
  { const n = o.ref_coord_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_RI_CoordinateSystem(r, ctx); o.ref_coords = a; }
  return o;
}
export function r_PRC_TYPE_ASM_FileStructureGlobals(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_FileStructureGlobals" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 303) throw new Error('PRC_TYPE_ASM_FileStructureGlobals.id: expected 303 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.file_count = B.UnsignedInteger(r); }
  { const n = o.file_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_UniqueId(r, ctx); o.unique_ids = a; }
  { o.global_data = r_FileStructureInternalGlobalData(r, ctx); }
  ctx.se(r, 303);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_ProductOccurrenceReference(r, ctx) {
  const o = { _t: "ProductOccurrenceReference" };
  { o.unique_id = r_UniqueId(r, ctx); }
  { o.root_index = B.UnsignedInteger(r); }
  { o.product_occurrence_is_active = B.Boolean(r); }
  return o;
}
export function r_PRC_TYPE_ASM_ModelFile(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_ModelFile" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 301) throw new Error('PRC_TYPE_ASM_ModelFile.id: expected 301 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.units_from_cad_file = B.Boolean(r); }
  { o.units_in_mm = B.Double(r); }
  { o.number_of_root_product_occurrences = B.UnsignedInteger(r); }
  { const n = o.number_of_root_product_occurrences; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ProductOccurrenceReference(r, ctx); o.product_occurrences = a; }
  { const n = ctx.get_num_fsi(); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.file_structure_index_in_model_file = a; }
  ctx.se(r, 301);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_BoundingBox(r, ctx) {
  const o = { _t: "BoundingBox" };
  { o.minimum_corner = r_Vector3D(r, ctx); }
  { o.maximum_corner = r_Vector3D(r, ctx); }
  return o;
}
export function r_PRC_TYPE_RI_BrepModel(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_BrepModel" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 232) throw new Error('PRC_TYPE_RI_BrepModel.id: expected 232 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.exact_geometry = B.Boolean(r); }
  if (!!o.exact_geometry) { o.index_topological_context = B.UnsignedInteger(r); }
  if (!!o.exact_geometry) { o.index_body = B.UnsignedInteger(r); }
  { o.is_closed = B.Boolean(r); }
  ctx.se(r, 232);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_Curve(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_Curve" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 233) throw new Error('PRC_TYPE_RI_Curve.id: expected 233 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.exact_geometry = B.Boolean(r); }
  if (!!o.exact_geometry) { o.index_topological_context = B.UnsignedInteger(r); }
  if (!!o.exact_geometry) { o.index_body = B.UnsignedInteger(r); }
  ctx.se(r, 233);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_Direction(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_Direction" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 234) throw new Error('PRC_TYPE_RI_Direction.id: expected 234 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.has_orgin = B.Boolean(r); }
  if (!!o.has_orgin) { o.origin = r_Vector3D(r, ctx); }
  { o.direction = r_Vector3D(r, ctx); }
  ctx.se(r, 234);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_Plane(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_Plane" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 235) throw new Error('PRC_TYPE_RI_Plane.id: expected 235 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.exact_geometry = B.Boolean(r); }
  if (!!o.exact_geometry) { o.index_topological_context = B.UnsignedInteger(r); }
  if (!!o.exact_geometry) { o.index_body = B.UnsignedInteger(r); }
  ctx.se(r, 235);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_PointSet(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_PointSet" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 236) throw new Error('PRC_TYPE_RI_PointSet.id: expected 236 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.number_of_points = B.UnsignedInteger(r); }
  { const n = o.number_of_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.points = a; }
  ctx.se(r, 236);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_PolyBrepModel(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_PolyBrepModel" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 237) throw new Error('PRC_TYPE_RI_PolyBrepModel.id: expected 237 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.is_closed = B.Boolean(r); }
  ctx.se(r, 237);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_PolyWire(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_PolyWire" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 238) throw new Error('PRC_TYPE_RI_PolyWire.id: expected 238 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  ctx.se(r, 238);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_Set(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_Set" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 239) throw new Error('PRC_TYPE_RI_Set.id: expected 239 got ' + o.id); }
  { o.item_content = r_RepresentationItemContent(r, ctx); }
  { o.number_of_items = B.UnsignedInteger(r); }
  { const n = o.number_of_items; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_RI_RepresentationItem(r, ctx); o.representation_items = a; }
  ctx.se(r, 239);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_RI_RepresentationItem(r, ctx) {
  const o = { _t: "PRC_TYPE_RI_RepresentationItem" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 232: o.data = r_PRC_TYPE_RI_BrepModel(r, ctx); break;   case 233: o.data = r_PRC_TYPE_RI_Curve(r, ctx); break;   case 234: o.data = r_PRC_TYPE_RI_Direction(r, ctx); break;   case 235: o.data = r_PRC_TYPE_RI_Plane(r, ctx); break;   case 236: o.data = r_PRC_TYPE_RI_PointSet(r, ctx); break;   case 237: o.data = r_PRC_TYPE_RI_PolyBrepModel(r, ctx); break;   case 238: o.data = r_PRC_TYPE_RI_PolyWire(r, ctx); break;   case 239: o.data = r_PRC_TYPE_RI_Set(r, ctx); break;   case 240: o.data = r_PRC_TYPE_RI_CoordinateSystem(r, ctx); break;   default: throw new Error('PRC_TYPE_RI_RepresentationItem: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 231);
  return o;
}
export const r_PRC_TYPE_RI = r_PRC_TYPE_RI_RepresentationItem;
export function r_AdditionalTargetData(r, ctx) {
  const o = { _t: "AdditionalTargetData" };
  { o.flag = B.Boolean(r); }
  if (!o.flag) { o.unique_id = r_UniqueId(r, ctx); }
  { o.index_of_topological_index = B.UnsignedInteger(r); }
  { o.index_of_body = B.UnsignedInteger(r); }
  { o.number_of_indices = B.UnsignedInteger(r); }
  { const n = o.number_of_indices; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.indices = a; }
  return o;
}
export function r_PRC_TYPE_MISC_ReferenceOnTopology(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_ReferenceOnTopology" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 206) throw new Error('PRC_TYPE_MISC_ReferenceOnTopology.id: expected 206 got ' + o.id); }
  { o.type_of_entity = B.UnsignedInteger(r); }
  { o.flag = B.Boolean(r); }
  if (!!o.flag) { o.data = r_AdditionalTargetData(r, ctx); }
  ctx.se(r, 206);
  return o;
}
export function r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_ReferenceOnPRCBase" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 205) throw new Error('PRC_TYPE_MISC_ReferenceOnPRCBase.id: expected 205 got ' + o.id); }
  { o.type_of_entity = B.UnsignedInteger(r); }
  { o.flag = B.Boolean(r); }
  if (!o.flag) { o.different_unique_id = r_UniqueId(r, ctx); }
  { o.unique_id = B.UnsignedInteger(r); }
  ctx.se(r, 205);
  return o;
}
export const r_ReferenceUniqueIdentifier = r_PRC_TYPE_MISC_ReferenceOnPRCBase;
export function r_ReferenceData(r, ctx) {
  const o = { _t: "ReferenceData" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 206: o.data = r_PRC_TYPE_MISC_ReferenceOnTopology(r, ctx); break;   case 205: o.data = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); break;   default: throw new Error('ReferenceData: unknown subtype ' + JSON.stringify(tid)); } }
  return o;
}
export function r_ContentEntityReference(r, ctx) {
  const o = { _t: "ContentEntityReference" };
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.index_of_local_coordinate_system = B.UnsignedInteger(r); }
  { o.flag = B.Boolean(r); }
  if (!!o.flag) { o.reference_data = r_ReferenceData(r, ctx); }
  return o;
}
export function r_ContentExtendedEntityReference(r, ctx) {
  const o = { _t: "ContentExtendedEntityReference" };
  { o.content_entity_reference = r_ContentEntityReference(r, ctx); }
  { o.has_reference_data = B.Boolean(r); }
  if (!!o.has_reference_data) { o.reference_data = r_ReferenceData(r, ctx); }
  return o;
}
export function r_PRC_TYPE_MISC_MarkupLinkedItem(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_MarkupLinkedItem" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 204) throw new Error('PRC_TYPE_MISC_MarkupLinkedItem.id: expected 204 got ' + o.id); }
  { o.content_extended_entity_reference = r_ContentExtendedEntityReference(r, ctx); }
  { o.show_markup = B.Boolean(r); }
  { o.delete_markup = B.Boolean(r); }
  { o.show_leader = B.Boolean(r); }
  { o.delete_leader = B.Boolean(r); }
  ctx.se(r, 204);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_MKP_Leader(r, ctx) {
  const o = { _t: "PRC_TYPE_MKP_Leader" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 503) throw new Error('PRC_TYPE_MKP_Leader.id: expected 503 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.is_first_linked_item = B.Boolean(r); }
  if (!!o.is_first_linked_item) { o.first_linked_item = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); }
  { o.is_second_linked_item = B.Boolean(r); }
  if (!!o.is_second_linked_item) { o.second_linked_item = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); }
  { o.biased_index_tessellation = B.UnsignedInteger(r); }
  ctx.se(r, 503);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_MKP_Markup(r, ctx) {
  const o = { _t: "PRC_TYPE_MKP_Markup" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 502) throw new Error('PRC_TYPE_MKP_Markup.id: expected 502 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.markup_type = B.UnsignedInteger(r); }
  { o.markup_subtype = B.UnsignedInteger(r); }
  { o.number_of_linked_items = B.UnsignedInteger(r); }
  { const n = o.number_of_linked_items; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); o.linked_items = a; }
  { o.number_of_leaders = B.UnsignedInteger(r); }
  { const n = o.number_of_leaders; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); o.leaders = a; }
  { o.biased_index_tessellation = B.UnsignedInteger(r); }
  ctx.se(r, 502);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_MKP_AnnotationItem(r, ctx) {
  const o = { _t: "PRC_TYPE_MKP_AnnotationItem" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 504) throw new Error('PRC_TYPE_MKP_AnnotationItem.id: expected 504 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.unique_id = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); }
  ctx.se(r, 504);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_MKP_AnnotationSet(r, ctx) {
  const o = { _t: "PRC_TYPE_MKP_AnnotationSet" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 505) throw new Error('PRC_TYPE_MKP_AnnotationSet.id: expected 505 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.number_of_annotations = B.UnsignedInteger(r); }
  { const n = o.number_of_annotations; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_AnnotationEntity(r, ctx); o.annotations = a; }
  ctx.se(r, 505);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_MKP_AnnotationReference(r, ctx) {
  const o = { _t: "PRC_TYPE_MKP_AnnotationReference" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 506) throw new Error('PRC_TYPE_MKP_AnnotationReference.id: expected 506 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.number_of_linked_items = B.UnsignedInteger(r); }
  { const n = o.number_of_linked_items; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); o.linked_items = a; }
  ctx.se(r, 506);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_AnnotationEntity(r, ctx) {
  const o = { _t: "AnnotationEntity" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 504: o.data = r_PRC_TYPE_MKP_AnnotationItem(r, ctx); break;   case 505: o.data = r_PRC_TYPE_MKP_AnnotationSet(r, ctx); break;   case 506: o.data = r_PRC_TYPE_MKP_AnnotationReference(r, ctx); break;   default: throw new Error('AnnotationEntity: unknown subtype ' + JSON.stringify(tid)); } }
  return o;
}
export const r_AnnotationEntities = r_AnnotationEntity;
export function r_MarkupData(r, ctx) {
  const o = { _t: "MarkupData" };
  { o.number_of_linked_items = B.UnsignedInteger(r); }
  { const n = o.number_of_linked_items; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_MarkupLinkedItem(r, ctx); o.linked_items = a; }
  { o.number_of_leaders = B.UnsignedInteger(r); }
  { const n = o.number_of_leaders; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MKP_Leader(r, ctx); o.leaders = a; }
  { o.number_of_markups = B.UnsignedInteger(r); }
  { const n = o.number_of_markups; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MKP_Markup(r, ctx); o.markups = a; }
  { o.number_of_annotation_entities = B.UnsignedInteger(r); }
  { const n = o.number_of_annotation_entities; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_AnnotationEntity(r, ctx); o.annotation_entities = a; }
  return o;
}
export function r_ContentSurface(r, ctx) {
  const o = { _t: "ContentSurface" };
  { o.has_base_geometry = B.Boolean(r); }
  if (!!o.has_base_geometry) { o.attribute_data = r_AttributeData(r, ctx); }
  if (!!o.has_base_geometry) { o.name = r_Name(r, ctx); }
  if (!!o.has_base_geometry) { o.id = B.UnsignedInteger(r); }
  { o.extend_type = B.UnsignedInteger(r); }
  return o;
}
export function r_Domain(r, ctx) {
  const o = { _t: "Domain" };
  { o.min_uv = r_Vector2D(r, ctx); }
  { o.max_uv = r_Vector2D(r, ctx); }
  return o;
}
export function r_PRC_TYPE_SURF_Plane(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Plane" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 86) throw new Error('PRC_TYPE_SURF_Plane.id: expected 86 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3D(r, ctx); }
  { o.parameterization = r_Domain(r, ctx); }
  { o.u_parameter_coeff_a = B.Double(r); }
  { o.v_parameter_coeff_a = B.Double(r); }
  { o.u_parameter_coeff_b = B.Double(r); }
  { o.v_parameter_coeff_b = B.Double(r); }
  ctx.se(r, 86);
  return o;
}
export function r_PRC_TYPE_GRAPH_AmbientLight(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_AmbientLight" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 731) throw new Error('PRC_TYPE_GRAPH_AmbientLight.id: expected 731 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_ambient_index = B.UnsignedInteger(r); }
  { o.biased_diffuse_index = B.UnsignedInteger(r); }
  { o.biased_specular_index = B.UnsignedInteger(r); }
  ctx.se(r, 731);
  return o;
}
export function r_PRC_TYPE_GRAPH_PointLight(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_PointLight" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 732) throw new Error('PRC_TYPE_GRAPH_PointLight.id: expected 732 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_ambient_index = B.UnsignedInteger(r); }
  { o.biased_diffuse_index = B.UnsignedInteger(r); }
  { o.biased_specular_index = B.UnsignedInteger(r); }
  { o.location = r_Vector3D(r, ctx); }
  { o.constant_attenuation_factor = B.Double(r); }
  { o.linear_attenuation_factor = B.Double(r); }
  { o.quadratic_attenuation_factor = B.Double(r); }
  ctx.se(r, 732);
  return o;
}
export function r_PRC_TYPE_GRAPH_DirectionalLight(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_DirectionalLight" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 733) throw new Error('PRC_TYPE_GRAPH_DirectionalLight.id: expected 733 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_ambient_index = B.UnsignedInteger(r); }
  { o.biased_diffuse_index = B.UnsignedInteger(r); }
  { o.biased_specular_index = B.UnsignedInteger(r); }
  { o.direction = r_Vector3D(r, ctx); }
  if (ctx.get_authoring_version() >= 8030) { o.intensity = B.Double(r); }
  ctx.se(r, 733);
  return o;
}
export function r_PRC_TYPE_GRAPH_SpotLight(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_SpotLight" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 734) throw new Error('PRC_TYPE_GRAPH_SpotLight.id: expected 734 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.biased_ambient_index = B.UnsignedInteger(r); }
  { o.biased_diffuse_index = B.UnsignedInteger(r); }
  { o.biased_specular_index = B.UnsignedInteger(r); }
  { o.location = r_Vector3D(r, ctx); }
  { o.constant_attenuation_factor = B.Double(r); }
  { o.linear_attenuation_factor = B.Double(r); }
  { o.quadratic_attenuation_factor = B.Double(r); }
  { o.direction = r_Vector3D(r, ctx); }
  { o.fall_off_angle = B.Double(r); }
  { o.fall_off_exponent = B.Double(r); }
  ctx.se(r, 734);
  return o;
}
export function r_Light(r, ctx) {
  const o = { _t: "Light" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 731: o.id = r_PRC_TYPE_GRAPH_AmbientLight(r, ctx); break;   case 732: o.id = r_PRC_TYPE_GRAPH_PointLight(r, ctx); break;   case 733: o.id = r_PRC_TYPE_GRAPH_DirectionalLight(r, ctx); break;   case 734: o.id = r_PRC_TYPE_GRAPH_SpotLight(r, ctx); break;   default: throw new Error('Light: unknown subtype ' + JSON.stringify(tid)); } }
  return o;
}
export function r_PRC_TYPE_GRAPH_Camera(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_Camera" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 742) throw new Error('PRC_TYPE_GRAPH_Camera.id: expected 742 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.is_orthographic = B.Boolean(r); }
  { o.position = r_Vector3D(r, ctx); }
  { o.look = r_Vector3D(r, ctx); }
  { o.up = r_Vector3D(r, ctx); }
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  { o.ratio = B.Double(r); }
  { o.clip_near = B.Double(r); }
  { o.clip_far = B.Double(r); }
  { o.zoom = B.Double(r); }
  ctx.se(r, 742);
  return o;
}
export function r_PRC_TYPE_GRAPH_SceneDisplayParameters(r, ctx) {
  const o = { _t: "PRC_TYPE_GRAPH_SceneDisplayParameters" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 741) throw new Error('PRC_TYPE_GRAPH_SceneDisplayParameters.id: expected 741 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.is_active = B.Boolean(r); }
  { o.number_of_lights = B.UnsignedInteger(r); }
  { const n = o.number_of_lights; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Light(r, ctx); o.lights = a; }
  { o.camera_defined = B.Boolean(r); }
  if (!!o.camera_defined) { o.camera = r_PRC_TYPE_GRAPH_Camera(r, ctx); }
  { o.rotation_center_defined = B.Boolean(r); }
  if (!!o.rotation_center_defined) { o.rotation_center = r_Vector3D(r, ctx); }
  { o.number_of_clipping_planes = B.UnsignedInteger(r); }
  { const n = o.number_of_clipping_planes; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_SURF_Plane(r, ctx); o.clipping_planes = a; }
  { o.biased_index_of_line_style_background = B.UnsignedInteger(r); }
  { o.biased_index_of_line_style_default = B.UnsignedInteger(r); }
  { o.number_default_styles = B.UnsignedInteger(r); }
  { const n = 2*o.number_default_styles; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.styles = a; }
  if (ctx.get_authoring_version() >= 8137) { o.is_absolute = B.Boolean(r); }
  ctx.se(r, 741);
  return o;
}
export const r_SceneDisplayParameters = r_PRC_TYPE_GRAPH_SceneDisplayParameters;
export function r_ContentLayerFilterItems(r, ctx) {
  const o = { _t: "ContentLayerFilterItems" };
  { o.b_is_inclusive = B.Boolean(r); }
  { o.number_of_layers = B.UnsignedInteger(r); }
  { const n = o.number_of_layers; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.layers = a; }
  return o;
}
export function r_PRC_TYPE_MISC_EntityReference(r, ctx) {
  const o = { _t: "PRC_TYPE_MISC_EntityReference" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 203) throw new Error('PRC_TYPE_MISC_EntityReference.id: expected 203 got ' + o.id); }
  { o.content_entity_reference = r_ContentEntityReference(r, ctx); }
  ctx.se(r, 203);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_ContentEntityFilterItems(r, ctx) {
  const o = { _t: "ContentEntityFilterItems" };
  { o.b_is_inclusive = B.Boolean(r); }
  { o.number_of_entities = B.UnsignedInteger(r); }
  { const n = o.number_of_entities; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_EntityReference(r, ctx); o.entities = a; }
  return o;
}
export function r_PRC_TYPE_ASM_Filter(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_Filter" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 320) throw new Error('PRC_TYPE_ASM_Filter.id: expected 320 got ' + o.id); }
  { o.base = r_ContentPRCRefBase(r, ctx); }
  { o.is_active = B.Boolean(r); }
  { o.layer_filter = r_ContentLayerFilterItems(r, ctx); }
  { o.entity_filter = r_ContentEntityFilterItems(r, ctx); }
  ctx.se(r, 320);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_MKP_View(r, ctx) {
  const o = { _t: "PRC_TYPE_MKP_View" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 501) throw new Error('PRC_TYPE_MKP_View.id: expected 501 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.number_of_annotations = B.UnsignedInteger(r); }
  { const n = o.number_of_annotations; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); o.annotations = a; }
  { o.annotation_plane = r_PRC_TYPE_SURF_Plane(r, ctx); }
  { o.has_parameters = B.Boolean(r); }
  if (!!o.has_parameters) { o.scene_display_parameters = r_PRC_TYPE_GRAPH_SceneDisplayParameters(r, ctx); }
  if (ctx.get_authoring_version() >= 8137) { o.is_annotation_view = B.Boolean(r); }
  if (ctx.get_authoring_version() >= 8137) { o.is_default_view = B.Boolean(r); }
  if (ctx.get_authoring_version() >= 8137) { o.is_direction = B.Boolean(r); }
  if (ctx.get_authoring_version() >= 8137) { o.number_of_linked_items = B.UnsignedInteger(r); }
  if (ctx.get_authoring_version() >= 8137) { const n = o.number_of_linked_items; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_ReferenceOnPRCBase(r, ctx); o.linked_items = a; }
  if (ctx.get_authoring_version() >= 8137) { o.number_of_filters = B.UnsignedInteger(r); }
  if (ctx.get_authoring_version() >= 8137) { const n = o.number_of_filters; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_ASM_Filter(r, ctx); o.filters = a; }
  ctx.se(r, 501);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_ASM_PartDefinition(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_PartDefinition" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 311) throw new Error('PRC_TYPE_ASM_PartDefinition.id: expected 311 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.bounding_box = r_BoundingBox(r, ctx); }
  { o.number_of_representation_items = B.UnsignedInteger(r); }
  { const n = o.number_of_representation_items; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_RI_RepresentationItem(r, ctx); o.representation_items = a; }
  { o.markups = r_MarkupData(r, ctx); }
  { o.number_of_views = B.UnsignedInteger(r); }
  { const n = o.number_of_views; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MKP_View(r, ctx); o.views = a; }
  ctx.se(r, 311);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_FileIdentifier(r, ctx) {
  const o = { _t: "FileIdentifier" };
  { o.flag = B.Boolean(r); }
  if (!o.flag) { o.unique_id = r_UniqueId(r, ctx); }
  return o;
}
export function r_ReferencesOfProductOccurrence(r, ctx) {
  const o = { _t: "ReferencesOfProductOccurrence" };
  { o.biased_index_part = B.UnsignedInteger(r); }
  { o.biased_index_prototype = B.UnsignedInteger(r); }
  if (o.biased_index_prototype != 0) { o.prototype_in_same_file_structure = r_FileIdentifier(r, ctx); }
  { o.biased_index_external_data = B.UnsignedInteger(r); }
  if (o.biased_index_external_data != 0) { o.external_data_in_same_file_structure = r_FileIdentifier(r, ctx); }
  { o.number_of_child_product_occurrences = B.UnsignedInteger(r); }
  { const n = o.number_of_child_product_occurrences; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.index_child_occurrence = a; }
  return o;
}
export function r_ProductInformation(r, ctx) {
  const o = { _t: "ProductInformation" };
  { o.unit_from_cad_file = B.Boolean(r); }
  { o.unit = B.Double(r); }
  { o.product_information_flags = B.Character(r); }
  { o.product_load_status = B.Integer(r); }
  return o;
}
export function r_PRC_TYPE_ASM_ProductOccurrence(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_ProductOccurrence" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 310) throw new Error('PRC_TYPE_ASM_ProductOccurrence.id: expected 310 got ' + o.id); }
  { o.base = r_PRC_TYPE_ROOT_PRCBaseWithGraphics(r, ctx); }
  { o.references_product_occurrence = r_ReferencesOfProductOccurrence(r, ctx); }
  { o.product_behavior = B.Character(r); }
  { o.product_information = r_ProductInformation(r, ctx); }
  { o.has_transformation = B.Boolean(r); }
  if (!!o.has_transformation) { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 202: o.location = r_PRC_TYPE_MISC_CartesianTransformation(r, ctx); break;   case 207: o.location = r_PRC_TYPE_MISC_GeneralTransformation(r, ctx); break;   default: throw new Error('PRC_TYPE_ASM_ProductOccurrence: unknown subtype ' + JSON.stringify(tid)); } }
  { o.entity_ref_count = B.UnsignedInteger(r); }
  { const n = o.entity_ref_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MISC_EntityReference(r, ctx); o.entity_reference = a; }
  { o.markups = r_MarkupData(r, ctx); }
  { o.number_of_views = B.UnsignedInteger(r); }
  { const n = o.number_of_views; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_MKP_View(r, ctx); o.views = a; }
  { o.has_filter = B.Boolean(r); }
  if (!!o.has_filter) { o.entity_filter = r_PRC_TYPE_ASM_Filter(r, ctx); }
  { o.number_of_display_filters = B.UnsignedInteger(r); }
  { const n = o.number_of_display_filters; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_ASM_Filter(r, ctx); o.display_filters = a; }
  { o.number_of_scene_parameters = B.UnsignedInteger(r); }
  { const n = o.number_of_scene_parameters; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_GRAPH_SceneDisplayParameters(r, ctx); o.scene_display_parameters = a; }
  ctx.se(r, 310);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_PRC_TYPE_ASM_FileStructure(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_FileStructure" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 302) throw new Error('PRC_TYPE_ASM_FileStructure.id: expected 302 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.next_available_index = B.UnsignedInteger(r); }
  { o.index_product_occurrence = B.UnsignedInteger(r); }
  ctx.se(r, 302);
  return o;
}
export function r_PRC_TYPE_ASM_FileStructureTree(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_FileStructureTree" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 304) throw new Error('PRC_TYPE_ASM_FileStructureTree.id: expected 304 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.part_count = B.UnsignedInteger(r); }
  { const n = o.part_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_ASM_PartDefinition(r, ctx); o.parts = a; }
  { o.product_count = B.UnsignedInteger(r); }
  { const n = o.product_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_ASM_ProductOccurrence(r, ctx); o.products = a; }
  { o.internal_data = r_PRC_TYPE_ASM_FileStructure(r, ctx); }
  ctx.se(r, 304);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_ColorRGB(r, ctx) {
  const o = { _t: "ColorRGB" };
  { const a = []; for (let i = 0; i < 3; i++) a.push(B.UnsignedCharacter(r)); o.color = a; }
  return o;
}
export function r_ColorRGBA(r, ctx) {
  const o = { _t: "ColorRGBA" };
  { const a = []; for (let i = 0; i < 4; i++) a.push(B.UnsignedCharacter(r)); o.color = a; }
  return o;
}
export function r_ColorDataRemainderRGB(r, ctx) {
  const o = { _t: "ColorDataRemainderRGB" };
  { o.is_same = B.Boolean(r); }
  if (!o.is_same) { o.color = r_ColorRGB(r, ctx); }
  return o;
}
export function r_ColorDataRemainderRGBA(r, ctx) {
  const o = { _t: "ColorDataRemainderRGBA" };
  { o.is_same = B.Boolean(r); }
  if (!o.is_same) { o.color = r_ColorRGBA(r, ctx); }
  return o;
}
export function r_VertexColors(r, ctx) {
  const o = { _t: "VertexColors" };
  { o.is_rgba = B.Boolean(r); }
  if (ctx.TESS_3D_Wire__is_inside()) { o.is_segment_color = B.Boolean(r); ctx.t3dw.set1(o.is_segment_color); }
  { o.b_optimized = B.Boolean(r); }
  if (!o.b_optimized && !o.is_rgba) { o.color_data_rgb_first_vertex = r_ColorRGB(r, ctx); }
  if (!o.b_optimized && !o.is_rgba) { const n = ctx.VertexColors_get_number_of_colors() - 1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ColorDataRemainderRGB(r, ctx); o.color_data_rgb_remaining_vertices = a; }
  if (!o.b_optimized && !!o.is_rgba) { o.color_data_rgba_first_vertex = r_ColorRGBA(r, ctx); }
  if (!o.b_optimized && !!o.is_rgba) { const n = ctx.VertexColors_get_number_of_colors() - 1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ColorDataRemainderRGBA(r, ctx); o.color_data_rgba_remaining_vertices = a; }
  return o;
}
export function r_PRC_TYPE_TESS_Face(r, ctx) {
  const o = { _t: "PRC_TYPE_TESS_Face" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 174) throw new Error('PRC_TYPE_TESS_Face.id: expected 174 got ' + o.id); }
  { o.size_of_line_attributes = B.UnsignedInteger(r); }
  { const n = o.size_of_line_attributes; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.line_attributes = a; }
  { o.start_of_wire_data = B.UnsignedInteger(r); }
  { o.size_of_sizes_wire = B.UnsignedInteger(r); }
  { const n = o.size_of_sizes_wire; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.sizes_wire = a; }
  { o.used_entities_flag = B.UnsignedInteger(r); }
  { o.start_triangulated = B.UnsignedInteger(r); }
  { o.size_of_triangulateddata = B.UnsignedInteger(r); }
  { const n = o.size_of_triangulateddata; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.triangulateddata = a; ctx.set_num_vertex_colors_from_tess_3d_face(o.used_entities_flag, o.triangulateddata); }
  { o.number_of_textured_coordinate_indices = B.UnsignedInteger(r); }
  { o.has_vertex_colors = B.Boolean(r); }
  if (!!o.has_vertex_colors) { o.vertex_color_data = r_VertexColors(r, ctx); }
  if (o.size_of_line_attributes > 0) { o.behavior = B.UnsignedInteger(r); }
  ctx.se(r, 174);
  return o;
}
export function r_PRC_TYPE_TESS_3D(r, ctx) {
  const o = { _t: "PRC_TYPE_TESS_3D" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 172) throw new Error('PRC_TYPE_TESS_3D.id: expected 172 got ' + o.id); }
  { o.tessellation_coordinates = r_ContentBaseTessData(r, ctx); }
  { o.has_faces = B.Boolean(r); }
  if (ctx.get_authoring_version() >= 7039) { o.has_loops = B.Boolean(r); }
  if (ctx.get_authoring_version() >= 7047) { o.must_calculate_normals = B.Boolean(r); }
  if (!!o.must_calculate_normals && ctx.get_authoring_version() >= 7047) { o.normal_recalculation_flags = B.Character(r); }
  if (!!o.must_calculate_normals && ctx.get_authoring_version() >= 7047) { o.crease_angle = B.Double(r); }
  { o.number_of_normal_coordinates = B.UnsignedInteger(r); }
  { const n = o.number_of_normal_coordinates; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.normal_coordinates = a; }
  { o.number_of_wire_indices = B.UnsignedInteger(r); }
  { const n = o.number_of_wire_indices; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.wire_indices = a; }
  { o.number_of_triangulated_indicies = B.UnsignedInteger(r); }
  { const n = o.number_of_triangulated_indicies; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.triangulated_index_array = a; }
  { o.number_of_face_tessellation = B.UnsignedInteger(r); }
  { const n = o.number_of_face_tessellation; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_TESS_Face(r, ctx); o.face_tessellation_data = a; }
  { o.number_of_texture_coordinates = B.UnsignedInteger(r); }
  { const n = o.number_of_texture_coordinates; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.texture_coordinates = a; }
  ctx.se(r, 172);
  return o;
}
export function r_PRC_TYPE_TESS_3D_Wire(r, ctx) {
  const o = { _t: "PRC_TYPE_TESS_3D_Wire" };
  ctx.TESS_3D_Wire__enter();
  { o.id = B.UnsignedInteger(r); if (o.id !== 175) throw new Error('PRC_TYPE_TESS_3D_Wire.id: expected 175 got ' + o.id); }
  { o.tessellation_coordinates = r_ContentBaseTessData(r, ctx); }
  { o.number_of_wire_indexes = B.UnsignedInteger(r); }
  { const n = o.number_of_wire_indexes; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedInteger(r); o.wire_indexes = a; ctx.t3dw.set0(o.tessellation_coordinates.coordinates, o.wire_indexes); }
  { o.has_vertex_colors = B.Boolean(r); }
  if (!!o.has_vertex_colors) { o.vertex_color_data = r_VertexColors(r, ctx); }
  ctx.se(r, 175);
  ctx.TESS_3D_Wire__leave();
  return o;
}
export function r_BinaryTextureData(r, ctx) {
  const o = { _t: "BinaryTextureData" };
  { o.texture_binary_data_size = B.UnsignedInteger(r); }
  { const n = o.texture_binary_data_size * 4; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.UnsignedCharacter(r); o.texture_binary_data = a; }
  { o.last_integer_used_bit_number = B.UnsignedInteger(r); }
  return o;
}
export function r_CompressedTextureParameter(r, ctx) {
  const o = { _t: "CompressedTextureParameter" };
  { o.binary_texture_data = r_BinaryTextureData(r, ctx); }
  { o.reference_array_size = B.UnsignedInteger(r); }
  { const n = o.reference_array_size; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.NumberOfBitsThenUnsignedInteger(r); o.reference_array = a; }
  { o.texture_parameters_tolerance = B.Double(r); }
  { o.texture_parameters_size = B.UnsignedInteger(r); }
  { const n = o.texture_parameters_size; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.FloatAsBytes(r); o.texture_parameters = a; }
  return o;
}
export function r_PRC_TYPE_TESS_3D_Compressed(r, ctx) {
  const o = { _t: "PRC_TYPE_TESS_3D_Compressed" };
  ctx.t3dc.enter();
  { o.id = B.UnsignedInteger(r); if (o.id !== 173) throw new Error('PRC_TYPE_TESS_3D_Compressed.id: expected 173 got ' + o.id); }
  { o.is_calculated = B.Boolean(r); }
  { o.has_faces = B.Boolean(r); }
  { o.tolerance = B.Double(r); }
  if (ctx.get_authoring_version() >= 7031) { const a = []; for (let i = 0; i < 3; i++) a.push(B.FloatAsBytes(r)); o.origin_array = a; }
  { o.point_array = B.CompressedIntegerArray(r); }
  { o.edge_status_array = B.CharacterArray(r, 2); }
  { o.triangle_face_array = B.CompressedIndiceArray(r); }
  { o.reference_array_size = B.UnsignedInteger(r); }
  { o.point_is_reference_array = B.UncompressedBoolArray(r, o.reference_array_size); }
  { o.point_reference_array = B.CompressedIndiceArrayWithoutBit(r, ctx.t3dc.number_of_referenced_points(o.point_is_reference_array) > 3); }
  { o.must_recalculate_normals = B.Boolean(r); ctx.t3dc.get_points(o.origin_array, o.point_array, o.tolerance, o.point_is_reference_array, o.point_reference_array, o.edge_status_array, o.triangle_face_array); }
  if (!!o.must_recalculate_normals) { o.normal_is_reversed = B.UncompressedBoolArray(r, o.triangle_face_array.length); }
  if (!!o.must_recalculate_normals) { o.crease_angle = B.Double(r); }
  if (!!o.must_recalculate_normals) { o.normal_recalculation_flags = B.Character(r); }
  if (!o.must_recalculate_normals) { o.normal_angle_number_of_bits = B.Character(r); }
  if (!o.must_recalculate_normals) { o.normal_binary_data_size = B.UnsignedInteger(r); }
  if (!o.must_recalculate_normals) { o.normal_binary_data = B.UncompressedBoolArray(r, o.normal_binary_data_size); }
  if (!o.must_recalculate_normals) { o.normal_angle_array = B.ShortArray(r, o.normal_angle_number_of_bits); }
  if (!o.must_recalculate_normals) { o.is_face_planar = B.UncompressedBoolArray(r, ctx.t3dc.number_of_faces_stored_in_mesh(o.triangle_face_array)); }
  { o.is_point_color = B.Boolean(r); }
  if (!!o.is_point_color) { o.is_point_color_on_face = B.UncompressedBoolArray(r, ((!o.has_faces) ? (1) : (ctx.t3dc.number_of_faces_stored_in_mesh(o.triangle_face_array)))); }
  if (!!o.is_point_color) { o.point_color_array = B.CharacterArray(r, 8); ctx.t3dc.on_point_color(o.point_color_array); }
  { o.is_multiple_line_attribute = B.Boolean(r); }
  if (!!o.is_multiple_line_attribute) { o.is_multiple_line_attribute_on_face = B.UncompressedBoolArray(r, ((!o.has_faces) ? (1) : (ctx.t3dc.number_of_faces_stored_in_mesh(o.triangle_face_array)))); }
  { o.line_attribute_array = B.ShortArray(r, 16); }
  { o.no_texture = B.Boolean(r); }
  if (!o.no_texture) { o.texture_data = r_CompressedTextureParameter(r, ctx); }
  if (!o.no_texture) { o.all_faces_have_texture = B.Boolean(r); }
  if (!o.no_texture && !o.all_faces_have_texture) { o.face_has_texture = B.UncompressedBoolArray(r, ctx.t3dc.number_of_faces_stored_in_mesh(o.triangle_face_array)); }
  { o.has_behaviors = B.Boolean(r); }
  if (!!o.has_behaviors) { o.behaviors_array = B.CharacterArray(r, 8); }
  ctx.se(r, 173);
  ctx.t3dc.leave();
  return o;
}
export function r_PRC_TYPE_TESS(r, ctx) {
  const o = { _t: "PRC_TYPE_TESS" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 172: o.id = r_PRC_TYPE_TESS_3D(r, ctx); break;   case 175: o.id = r_PRC_TYPE_TESS_3D_Wire(r, ctx); break;   case 176: o.id = r_PRC_TYPE_TESS_Markup(r, ctx); break;   case 173: o.id = r_PRC_TYPE_TESS_3D_Compressed(r, ctx); break;   default: throw new Error('PRC_TYPE_TESS: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 170);
  return o;
}
export function r_PRC_TYPE_ASM_FileStructureTessellation(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_FileStructureTessellation" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 305) throw new Error('PRC_TYPE_ASM_FileStructureTessellation.id: expected 305 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.tess_count = B.UnsignedInteger(r); }
  { const n = o.tess_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_TESS(r, ctx); o.tess = a; }
  ctx.se(r, 305);
  { o.user_data = B.UserData(r); }
  return o;
}
export function r_BaseTopology(r, ctx) {
  const o = { _t: "BaseTopology" };
  { o.has_base = B.Boolean(r); }
  if (!!o.has_base) { o.attribute_data = r_AttributeData(r, ctx); }
  if (!!o.has_base) { o.name = r_Name(r, ctx); }
  if (!!o.has_base) { o.id = B.UnsignedInteger(r); }
  return o;
}
export function r_ContentBody(r, ctx) {
  const o = { _t: "ContentBody" };
  { o.base = r_BaseTopology(r, ctx); }
  { o.bounding_box_behavior = B.Character(r); }
  return o;
}
export function r_PRC_TYPE_TOPO_MultipleVertex(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_MultipleVertex" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 143) throw new Error('PRC_TYPE_TOPO_MultipleVertex.id: expected 143 got ' + o.id); }
  { o.base = r_BaseTopology(r, ctx); }
  { o.number_of_points = B.UnsignedInteger(r); }
  { const n = o.number_of_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.points = a; }
  ctx.se(r, 143);
  return o;
}
export function r_PRC_TYPE_TOPO_UniqueVertex(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_UniqueVertex" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 144) throw new Error('PRC_TYPE_TOPO_UniqueVertex.id: expected 144 got ' + o.id); }
  { o.base = r_BaseTopology(r, ctx); }
  { o.vertex = r_Vector3D(r, ctx); }
  { o.has_tolerance = B.Boolean(r); }
  if (!!o.has_tolerance) { o.tolerance = B.Double(r); }
  ctx.se(r, 144);
  return o;
}
export function r_Interval(r, ctx) {
  const o = { _t: "Interval" };
  { o.min_value = B.Double(r); }
  { o.max_value = B.Double(r); }
  return o;
}
export function r_Parameterization(r, ctx) {
  const o = { _t: "Parameterization" };
  { o.trim_interval = r_Interval(r, ctx); }
  { o.coeff_a = B.Double(r); }
  { o.coeff_b = B.Double(r); }
  return o;
}
export function r_UVParameterization(r, ctx) {
  const o = { _t: "UVParameterization" };
  { o.swap_uv = B.Boolean(r); }
  { o.suface_domain = r_Domain(r, ctx); }
  { o.u_param_coeff_a = B.Double(r); }
  { o.v_param_coeff_a = B.Double(r); }
  { o.u_param_coeff_b = B.Double(r); }
  { o.v_param_coeff_b = B.Double(r); }
  return o;
}
export function r_ContentCurve(r, ctx) {
  const o = { _t: "ContentCurve" };
  { o.has_base_geometry = B.Boolean(r); }
  if (!!o.has_base_geometry) { o.attribute_data = r_AttributeData(r, ctx); }
  if (!!o.has_base_geometry) { o.name = r_Name(r, ctx); }
  if (!!o.has_base_geometry) { o.id = B.UnsignedInteger(r); }
  { o.extend_type = B.UnsignedInteger(r); }
  { o.is_3d_flag = B.Boolean(r); ctx.ContentCurve_is_3d_flag = o.is_3d_flag; }
  return o;
}
export function r_PRC_TYPE_CRV_Blend02Boundary(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Blend02Boundary" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 12) throw new Error('PRC_TYPE_CRV_Blend02Boundary.id: expected 12 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!o.curve_data.is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (!!o.curve_data.is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.surface = r_PtrSurface(r, ctx); }
  { o.bound = B.Integer(r); }
  { o.number_of_crossing_points = B.UnsignedInteger(r); }
  { const n = o.number_of_crossing_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.crossing_points = a; }
  { o.chord_error = B.Double(r); }
  { o.angle_error = B.Double(r); }
  { o.bound_surface = r_PtrSurface(r, ctx); }
  { o.sense_bound_surface = B.Boolean(r); }
  { o.intersection_order = B.Boolean(r); }
  { o.sense_intersection_order = B.Boolean(r); }
  { o.base_parameter = B.Double(r); }
  { o.base_scale = B.Double(r); }
  { o.start_limit_point = r_Vector3D(r, ctx); }
  { o.start_limit_type = B.UnsignedInteger(r); }
  { o.end_limit_point = r_Vector3D(r, ctx); }
  { o.end_limit_type = B.UnsignedInteger(r); }
  ctx.se(r, 12);
  return o;
}
export function r_ControlPointsNurbsCrv(r, ctx) {
  const o = { _t: "ControlPointsNurbsCrv" };
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  if (ctx.ContentCurve_is_3d_flag) { o.z = B.Double(r); }
  if (ctx.PRC_TYPE_CRV_NURBS_is_rational) { o.w = B.Double(r); }
  return o;
}
export function r_PRC_TYPE_CRV_NURBS(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_NURBS" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 13) throw new Error('PRC_TYPE_CRV_NURBS.id: expected 13 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  { o.is_rational = B.Boolean(r); ctx.PRC_TYPE_CRV_NURBS_is_rational = o.is_rational; }
  { o.degree = B.UnsignedInteger(r); }
  { o.highest_index_of_control_points = B.UnsignedInteger(r); }
  { o.highest_index_of_knots = B.UnsignedInteger(r); }
  { const n = o.highest_index_of_control_points + 1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ControlPointsNurbsCrv(r, ctx); o.p = a; }
  { const n = o.highest_index_of_knots + 1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.u = a; }
  { o.knot_type = B.UnsignedInteger(r); }
  { o.curve_form = B.UnsignedInteger(r); }
  ctx.se(r, 13);
  return o;
}
export function r_PRC_TYPE_CRV_Circle(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Circle" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 14) throw new Error('PRC_TYPE_CRV_Circle.id: expected 14 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.radius = B.Double(r); }
  ctx.se(r, 14);
  return o;
}
export function r_CompositeSubCurve(r, ctx) {
  const o = { _t: "CompositeSubCurve" };
  { o.subcurve = r_PtrCurve(r, ctx); }
  { o.sense = B.Boolean(r); }
  return o;
}
export function r_PRC_TYPE_CRV_Composite(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Composite" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 15) throw new Error('PRC_TYPE_CRV_Composite.id: expected 15 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.number_of_subcurves = B.UnsignedInteger(r); }
  { const n = o.number_of_subcurves; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompositeSubCurve(r, ctx); o.subcurves = a; }
  { o.is_closed = B.Boolean(r); }
  ctx.se(r, 15);
  return o;
}
export function r_PRC_TYPE_CRV_OnSurf(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_OnSurf" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 16) throw new Error('PRC_TYPE_CRV_OnSurf.id: expected 16 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.tolerance = B.Double(r); }
  { o.uv_curve = r_PtrCurve(r, ctx); }
  { o.surface = r_PtrSurface(r, ctx); }
  { o.uv_domain = r_Domain(r, ctx); }
  ctx.se(r, 16);
  return o;
}
export function r_PRC_TYPE_CRV_Ellipse(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Ellipse" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 17) throw new Error('PRC_TYPE_CRV_Ellipse.id: expected 17 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.rx = B.Double(r); }
  { o.ry = B.Double(r); }
  ctx.se(r, 17);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_1D_Polynom(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_1D_Polynom" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 902) throw new Error('PRC_TYPE_MATH_FCT_1D_Polynom.id: expected 902 got ' + o.id); }
  { o.number_of_coefficients = B.UnsignedInteger(r); }
  { const n = o.number_of_coefficients; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.coefficient = a; }
  ctx.se(r, 902);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_1D_Trigonometric(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_1D_Trigonometric" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 903) throw new Error('PRC_TYPE_MATH_FCT_1D_Trigonometric.id: expected 903 got ' + o.id); }
  { o.amplitude = B.Double(r); }
  { o.phase = B.Double(r); }
  { o.freq = B.Double(r); }
  { o.dc_offset = B.Double(r); }
  ctx.se(r, 903);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_1D_Fraction(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_1D_Fraction" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 904) throw new Error('PRC_TYPE_MATH_FCT_1D_Fraction.id: expected 904 got ' + o.id); }
  { o.numerator = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  { o.denominator = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  ctx.se(r, 904);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_1D_ArctanCos(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_1D_ArctanCos" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 905) throw new Error('PRC_TYPE_MATH_FCT_1D_ArctanCos.id: expected 905 got ' + o.id); }
  { o.a = B.Double(r); }
  { o.amplitude = B.Double(r); }
  { o.frequency = B.Double(r); }
  { o.phase = B.Double(r); }
  { o.e = B.Double(r); }
  ctx.se(r, 905);
  return o;
}
export function r_CombinationFunctions(r, ctx) {
  const o = { _t: "CombinationFunctions" };
  { o.coefficient = B.Double(r); }
  { o.function = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  return o;
}
export function r_PRC_TYPE_MATH_FCT_1D_Combination(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_1D_Combination" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 906) throw new Error('PRC_TYPE_MATH_FCT_1D_Combination.id: expected 906 got ' + o.id); }
  { o.number_of_coefficients = B.UnsignedInteger(r); }
  { const n = o.number_of_coefficients; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CombinationFunctions(r, ctx); o.coefficient = a; }
  ctx.se(r, 906);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_1D(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_1D" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 902: o.id = r_PRC_TYPE_MATH_FCT_1D_Polynom(r, ctx); break;   case 903: o.id = r_PRC_TYPE_MATH_FCT_1D_Trigonometric(r, ctx); break;   case 904: o.id = r_PRC_TYPE_MATH_FCT_1D_Fraction(r, ctx); break;   case 905: o.id = r_PRC_TYPE_MATH_FCT_1D_ArctanCos(r, ctx); break;   case 906: o.id = r_PRC_TYPE_MATH_FCT_1D_Combination(r, ctx); break;   default: throw new Error('PRC_TYPE_MATH_FCT_1D: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 901);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_3D_Linear(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_3D_Linear" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 911) throw new Error('PRC_TYPE_MATH_FCT_3D_Linear.id: expected 911 got ' + o.id); }
  { const a = []; for (let i = 0; i < 3; i++) a.push(r_Vector3D(r, ctx)); o.mat = a; }
  { o.vect = r_Vector3D(r, ctx); }
  ctx.se(r, 911);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_3D_NonLinear(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_3D_NonLinear" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 912) throw new Error('PRC_TYPE_MATH_FCT_3D_NonLinear.id: expected 912 got ' + o.id); }
  { o.left_transformation = r_PRC_TYPE_MATH_FCT_3D(r, ctx); }
  { o.right_transformation = r_PRC_TYPE_MATH_FCT_3D(r, ctx); }
  { o.d2 = B.Double(r); }
  { o.reserved_double = B.Double(r); }
  { o.reserved_int_1 = B.Integer(r); }
  { o.reserved_int_2 = B.Integer(r); }
  { o.reserved_int_3 = B.Integer(r); }
  ctx.se(r, 912);
  return o;
}
export function r_PRC_TYPE_MATH_FCT_3D(r, ctx) {
  const o = { _t: "PRC_TYPE_MATH_FCT_3D" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 911: o.id = r_PRC_TYPE_MATH_FCT_3D_Linear(r, ctx); break;   case 912: o.id = r_PRC_TYPE_MATH_FCT_3D_NonLinear(r, ctx); break;   default: throw new Error('PRC_TYPE_MATH_FCT_3D: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 910);
  return o;
}
export function r_PRC_TYPE_CRV_Equation(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Equation" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 18) throw new Error('PRC_TYPE_CRV_Equation.id: expected 18 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.interval = r_Interval(r, ctx); }
  { o.x_function = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  { o.y_function = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.z_function = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  ctx.se(r, 18);
  return o;
}
export function r_Type0HelixData(r, ctx) {
  const o = { _t: "Type0HelixData" };
  { o.origin0 = B.Double(r); }
  { o.direction0 = B.Double(r); }
  { o.origin1 = B.Double(r); }
  { o.direction1 = B.Double(r); }
  { o.origin2 = B.Double(r); }
  { o.direction2 = B.Double(r); }
  { o.pitch = B.Double(r); }
  { o.radius = B.Double(r); }
  return o;
}
export function r_Type1HelixData(r, ctx) {
  const o = { _t: "Type1HelixData" };
  { o.unit_z0 = B.Double(r); }
  { o.unit_u0 = B.Double(r); }
  { o.unit_z1 = B.Double(r); }
  { o.unit_u1 = B.Double(r); }
  { o.unit_z2 = B.Double(r); }
  { o.unit_u2 = B.Double(r); }
  { const a = []; for (let i = 0; i < 4; i++) a.push(B.Double(r)); o.reserved_double = a; }
  { o.radius_law = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  { o.z_law = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  { o.theta_law = r_PRC_TYPE_MATH_FCT_1D(r, ctx); }
  return o;
}
export function r_PRC_TYPE_CRV_Helix(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Helix" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 19) throw new Error('PRC_TYPE_CRV_Helix.id: expected 19 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o._type = B.Character(r); }
  { o.orientation = B.Boolean(r); }
  { o.start = r_Vector3D(r, ctx); }
  { o.type0_helix = r_Type0HelixData(r, ctx); }
  { o.type1_helix = r_Type1HelixData(r, ctx); }
  ctx.se(r, 19);
  return o;
}
export function r_PRC_TYPE_CRV_Hyperbola(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Hyperbola" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 20) throw new Error('PRC_TYPE_CRV_Hyperbola.id: expected 20 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.semi_axis = B.Double(r); }
  { o.semi_image_axis = B.Double(r); }
  { o._type = B.Character(r); }
  ctx.se(r, 20);
  return o;
}
export function r_CrossingPointsCrvIntersection(r, ctx) {
  const o = { _t: "CrossingPointsCrvIntersection" };
  { o.position = r_Vector3D(r, ctx); }
  { o.uv_surface_1 = r_Vector2D(r, ctx); }
  { o.uv_surface_2 = r_Vector2D(r, ctx); }
  { o.tangent = r_Vector3D(r, ctx); }
  { o.parameter = B.Double(r); }
  { o.scale = B.Double(r); }
  { o.flags = B.Character(r); }
  return o;
}
export function r_PRC_TYPE_CRV_Intersection(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Intersection" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 21) throw new Error('PRC_TYPE_CRV_Intersection.id: expected 21 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.surface_1 = r_PtrSurface(r, ctx); }
  { o.surface_2 = r_PtrSurface(r, ctx); }
  { o.sense_1 = B.Boolean(r); }
  { o.sense_2 = B.Boolean(r); }
  { o.sense_cross = B.Boolean(r); }
  { o.number_of_crossings = B.UnsignedInteger(r); }
  { const n = o.number_of_crossings; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CrossingPointsCrvIntersection(r, ctx); o.crossings = a; }
  { o.start_limit = r_Vector3D(r, ctx); }
  { o.start_limit_type = B.UnsignedInteger(r); }
  { o.end_limit = r_Vector3D(r, ctx); }
  { o.end_limit_type = B.UnsignedInteger(r); }
  { o.chord_error = B.Double(r); }
  { o.angle_error = B.Double(r); }
  { o.param_respected = B.Boolean(r); }
  ctx.se(r, 21);
  return o;
}
export function r_PRC_TYPE_CRV_Line(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Line" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 22) throw new Error('PRC_TYPE_CRV_Line.id: expected 22 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  ctx.se(r, 22);
  return o;
}
export function r_PRC_TYPE_CRV_Offset(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Offset" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 23) throw new Error('PRC_TYPE_CRV_Offset.id: expected 23 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.base_curve = r_PtrCurve(r, ctx); }
  { o.offset_plane_normal = r_Vector3D(r, ctx); }
  { o.offset = B.Double(r); }
  ctx.se(r, 23);
  return o;
}
export function r_PRC_TYPE_CRV_Parabola(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Parabola" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 24) throw new Error('PRC_TYPE_CRV_Parabola.id: expected 24 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.focal_length = B.Double(r); }
  { o._type = B.Character(r); }
  ctx.se(r, 24);
  return o;
}
export function r_PRC_TYPE_CRV_PolyLine(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_PolyLine" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 25) throw new Error('PRC_TYPE_CRV_PolyLine.id: expected 25 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.number_of_points = B.UnsignedInteger(r); }
  if (o.curve_data.is_3d_flag) { const n = o.number_of_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.points_3d = a; }
  if (!o.curve_data.is_3d_flag) { const n = o.number_of_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector2D(r, ctx); o.points_2d = a; }
  ctx.se(r, 25);
  return o;
}
export function r_PRC_TYPE_CRV_Transform(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV_Transform" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 26) throw new Error('PRC_TYPE_CRV_Transform.id: expected 26 got ' + o.id); }
  { o.curve_data = r_ContentCurve(r, ctx); }
  if (!ctx.ContentCurve_is_3d_flag) { o.transform2d = r_Transformation2DWithBit(r, ctx); }
  if (ctx.ContentCurve_is_3d_flag) { o.transform3d = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_Parameterization(r, ctx); }
  { o.base_curve = r_PtrCurve(r, ctx); }
  { o.math_transformation = r_PRC_TYPE_MATH_FCT_3D(r, ctx); }
  ctx.se(r, 26);
  return o;
}
export function r_PRC_TYPE_CRV(r, ctx) {
  const o = { _t: "PRC_TYPE_CRV" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 0: o.id = r_PRC_TYPE_ROOT(r, ctx); break;   case 12: o.id = r_PRC_TYPE_CRV_Blend02Boundary(r, ctx); break;   case 13: o.id = r_PRC_TYPE_CRV_NURBS(r, ctx); break;   case 14: o.id = r_PRC_TYPE_CRV_Circle(r, ctx); break;   case 15: o.id = r_PRC_TYPE_CRV_Composite(r, ctx); break;   case 16: o.id = r_PRC_TYPE_CRV_OnSurf(r, ctx); break;   case 17: o.id = r_PRC_TYPE_CRV_Ellipse(r, ctx); break;   case 18: o.id = r_PRC_TYPE_CRV_Equation(r, ctx); break;   case 19: o.id = r_PRC_TYPE_CRV_Helix(r, ctx); break;   case 20: o.id = r_PRC_TYPE_CRV_Hyperbola(r, ctx); break;   case 21: o.id = r_PRC_TYPE_CRV_Intersection(r, ctx); break;   case 22: o.id = r_PRC_TYPE_CRV_Line(r, ctx); break;   case 23: o.id = r_PRC_TYPE_CRV_Offset(r, ctx); break;   case 24: o.id = r_PRC_TYPE_CRV_Parabola(r, ctx); break;   case 25: o.id = r_PRC_TYPE_CRV_PolyLine(r, ctx); break;   case 26: o.id = r_PRC_TYPE_CRV_Transform(r, ctx); break;   default: throw new Error('PRC_TYPE_CRV: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 10);
  return o;
}
export function r_PtrCurve(r, ctx) {
  const o = { _t: "PtrCurve" };
  { o.is_referenced = B.Boolean(r); }
  if (!o.is_referenced) { o.curve = r_PRC_TYPE_CRV(r, ctx); }
  if (!!o.is_referenced) { o.curve_identifier = B.UnsignedInteger(r); }
  return o;
}
export function r_PRC_TYPE_SURF_Blend01(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Blend01" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 77) throw new Error('PRC_TYPE_SURF_Blend01.id: expected 77 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.tranform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.center_curve = r_PtrCurve(r, ctx); }
  { o.orgin_cruve = r_PtrCurve(r, ctx); }
  { o.tangent_curve = r_PtrCurve(r, ctx); }
  ctx.se(r, 77);
  return o;
}
export function r_PRC_TYPE_SURF_Blend02(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Blend02" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 78) throw new Error('PRC_TYPE_SURF_Blend02.id: expected 78 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.tranform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.bound_surface_0 = r_PtrSurface(r, ctx); }
  { o.bound_curve_0 = r_PtrCurve(r, ctx); }
  { o.bound_surface_1 = r_PtrSurface(r, ctx); }
  { o.bound_curve_1 = r_PtrCurve(r, ctx); }
  { o.center_curve = r_PtrCurve(r, ctx); }
  { o.center_curve_sense = B.Boolean(r); }
  { o.bound_surface_0_sense = B.Boolean(r); }
  { o.bound_surface_1_sense = B.Boolean(r); }
  { o.radius_0 = B.Double(r); }
  { o.radius_1 = B.Double(r); }
  { o.cliff_suface_0 = r_PtrSurface(r, ctx); }
  { o.cliff_surface_1 = r_PtrSurface(r, ctx); }
  { o.parameterization_type = B.Character(r); }
  ctx.se(r, 78);
  return o;
}
export function r_PRC_TYPE_SURF_Blend03(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Blend03" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 79) throw new Error('PRC_TYPE_SURF_Blend03.id: expected 79 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.number_of_elements = B.UnsignedInteger(r); }
  { const n = o.number_of_elements; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.parameters = a; }
  { const n = o.number_of_elements; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Integer(r); o.multiplicities = a; }
  { const n = o.number_of_elements * 3; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.points = a; }
  { const n = o.number_of_elements; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.rail_2_angles_v = a; }
  { const n = o.number_of_elements * 3; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.tangents = a; }
  { const n = o.number_of_elements; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.rail_2_derivatives_v = a; }
  { const n = o.number_of_elements * 3; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.second_derivatives = a; }
  { const n = o.number_of_elements; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.rail_2_second_derivatives = a; }
  { o.rail_2_parameter_v = B.Double(r); }
  { o.trim_v_min = B.Double(r); }
  { o.trim_v_max = B.Double(r); }
  { const a = []; for (let i = 0; i < 6; i++) a.push(B.Integer(r)); o.reserved_int = a; }
  { const a = []; for (let i = 0; i < 3; i++) a.push(B.Character(r)); o.reserved_char = a; }
  { o.number_of_supplimental_doubles = B.UnsignedInteger(r); }
  { const n = o.number_of_supplimental_doubles; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.supplimental_doubles = a; }
  ctx.se(r, 79);
  return o;
}
export function r_ControlPointsNurbsSurf3(r, ctx) {
  const o = { _t: "ControlPointsNurbsSurf3" };
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  { o.z = B.Double(r); }
  return o;
}
export function r_ControlPointsNurbsSurf4(r, ctx) {
  const o = { _t: "ControlPointsNurbsSurf4" };
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  { o.z = B.Double(r); }
  { o.w = B.Double(r); }
  return o;
}
export function r_PRC_TYPE_SURF_NURBS(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_NURBS" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 80) throw new Error('PRC_TYPE_SURF_NURBS.id: expected 80 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.is_rational = B.Boolean(r); }
  { o.du = B.UnsignedInteger(r); }
  { o.dv = B.UnsignedInteger(r); }
  { o.highest_index_of_control_points_in_u = B.UnsignedInteger(r); }
  { o.highest_index_of_control_points_in_v = B.UnsignedInteger(r); }
  { o.highest_index_of_knots_in_u = B.UnsignedInteger(r); }
  { o.highest_index_of_knots_in_v = B.UnsignedInteger(r); }
  if (!o.is_rational) { const n = (o.highest_index_of_control_points_in_u+1) * (o.highest_index_of_control_points_in_v+1); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ControlPointsNurbsSurf3(r, ctx); o.p3 = a; }
  if (!!o.is_rational) { const n = (o.highest_index_of_control_points_in_u+1) * (o.highest_index_of_control_points_in_v+1); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_ControlPointsNurbsSurf4(r, ctx); o.p4 = a; }
  { const n = o.highest_index_of_knots_in_u+1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.ku = a; }
  { const n = o.highest_index_of_knots_in_v+1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.kv = a; }
  { o.knot_type = B.UnsignedInteger(r); }
  { o.surface_form = B.UnsignedInteger(r); }
  ctx.se(r, 80);
  return o;
}
export function r_PRC_TYPE_SURF_Cone(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Cone" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 81) throw new Error('PRC_TYPE_SURF_Cone.id: expected 81 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.radius = B.Double(r); }
  { o.semi_angle = B.Double(r); }
  ctx.se(r, 81);
  return o;
}
export function r_PRC_TYPE_SURF_Cylinder(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Cylinder" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 82) throw new Error('PRC_TYPE_SURF_Cylinder.id: expected 82 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.radius = B.Double(r); }
  ctx.se(r, 82);
  return o;
}
export function r_PRC_TYPE_SURF_Cylindrical(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Cylindrical" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 83) throw new Error('PRC_TYPE_SURF_Cylindrical.id: expected 83 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.base_surface = r_PtrSurface(r, ctx); }
  { o.tolerance = B.Double(r); }
  ctx.se(r, 83);
  return o;
}
export function r_PRC_TYPE_SURF_Offset(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Offset" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 84) throw new Error('PRC_TYPE_SURF_Offset.id: expected 84 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.base_surface = r_PtrSurface(r, ctx); }
  { o.offset_distance = B.Double(r); }
  ctx.se(r, 84);
  return o;
}
export function r_PRC_TYPE_SURF_Pipe(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Pipe" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 85) throw new Error('PRC_TYPE_SURF_Pipe.id: expected 85 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.center_curve = r_PtrCurve(r, ctx); }
  { o.orgin_curve = r_PtrCurve(r, ctx); }
  { o.radius = B.Double(r); }
  ctx.se(r, 85);
  return o;
}
export function r_PRC_TYPE_SURF_Ruled(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Ruled" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 87) throw new Error('PRC_TYPE_SURF_Ruled.id: expected 87 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.first_curve = r_PtrCurve(r, ctx); }
  { o.second_curve = r_PtrCurve(r, ctx); }
  ctx.se(r, 87);
  return o;
}
export function r_PRC_TYPE_SURF_Sphere(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Sphere" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 88) throw new Error('PRC_TYPE_SURF_Sphere.id: expected 88 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.radius = B.Double(r); }
  ctx.se(r, 88);
  return o;
}
export function r_PRC_TYPE_SURF_Revolution(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Revolution" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 89) throw new Error('PRC_TYPE_SURF_Revolution.id: expected 89 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.tolerance = B.Double(r); }
  { o.origin = r_Vector3D(r, ctx); }
  { o.x_axis = r_Vector3D(r, ctx); }
  { o.y_axis = r_Vector3D(r, ctx); }
  { o.base_curve = r_PtrCurve(r, ctx); }
  ctx.se(r, 89);
  return o;
}
export function r_PRC_TYPE_SURF_Extrusion(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Extrusion" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 90) throw new Error('PRC_TYPE_SURF_Extrusion.id: expected 90 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.sweep_vector = r_Vector3D(r, ctx); }
  { o.base_curve = r_PtrCurve(r, ctx); }
  ctx.se(r, 90);
  return o;
}
export function r_PRC_TYPE_SURF_FromCurves(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_FromCurves" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 91) throw new Error('PRC_TYPE_SURF_FromCurves.id: expected 91 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.origin = r_Vector3D(r, ctx); }
  { o.first_curve = r_PtrCurve(r, ctx); }
  { o.second_curve = r_PtrCurve(r, ctx); }
  ctx.se(r, 91);
  return o;
}
export function r_PRC_TYPE_SURF_Torus(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Torus" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 92) throw new Error('PRC_TYPE_SURF_Torus.id: expected 92 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.major_radius = B.Double(r); }
  { o.minor_radius = B.Double(r); }
  ctx.se(r, 92);
  return o;
}
export function r_PRC_TYPE_SURF_Transform(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Transform" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 93) throw new Error('PRC_TYPE_SURF_Transform.id: expected 93 got ' + o.id); }
  { o.curve_data = r_ContentSurface(r, ctx); }
  { o.transform = r_Transformation3DWithBit(r, ctx); }
  { o.parameterization = r_UVParameterization(r, ctx); }
  { o.base_surface = r_PtrSurface(r, ctx); }
  { o.math_transformation = r_PRC_TYPE_MATH_FCT_3D(r, ctx); }
  ctx.se(r, 93);
  return o;
}
export function r_PRC_TYPE_SURF_Blend04(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF_Blend04" };
  throw new Error('unsupported PRC_TYPE_SURF_Blend04');
  return o;
}
export function r_PRC_TYPE_SURF(r, ctx) {
  const o = { _t: "PRC_TYPE_SURF" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 0: o.id = r_PRC_TYPE_ROOT(r, ctx); break;   case 77: o.id = r_PRC_TYPE_SURF_Blend01(r, ctx); break;   case 78: o.id = r_PRC_TYPE_SURF_Blend02(r, ctx); break;   case 79: o.id = r_PRC_TYPE_SURF_Blend03(r, ctx); break;   case 80: o.id = r_PRC_TYPE_SURF_NURBS(r, ctx); break;   case 81: o.id = r_PRC_TYPE_SURF_Cone(r, ctx); break;   case 82: o.id = r_PRC_TYPE_SURF_Cylinder(r, ctx); break;   case 83: o.id = r_PRC_TYPE_SURF_Cylindrical(r, ctx); break;   case 84: o.id = r_PRC_TYPE_SURF_Offset(r, ctx); break;   case 85: o.id = r_PRC_TYPE_SURF_Pipe(r, ctx); break;   case 86: o.id = r_PRC_TYPE_SURF_Plane(r, ctx); break;   case 87: o.id = r_PRC_TYPE_SURF_Ruled(r, ctx); break;   case 88: o.id = r_PRC_TYPE_SURF_Sphere(r, ctx); break;   case 89: o.id = r_PRC_TYPE_SURF_Revolution(r, ctx); break;   case 90: o.id = r_PRC_TYPE_SURF_Extrusion(r, ctx); break;   case 91: o.id = r_PRC_TYPE_SURF_FromCurves(r, ctx); break;   case 92: o.id = r_PRC_TYPE_SURF_Torus(r, ctx); break;   case 93: o.id = r_PRC_TYPE_SURF_Transform(r, ctx); break;   case 94: o.id = r_PRC_TYPE_SURF_Blend04(r, ctx); break;   default: throw new Error('PRC_TYPE_SURF: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 75);
  return o;
}
export function r_PtrSurface(r, ctx) {
  const o = { _t: "PtrSurface" };
  { o.is_referenced = B.Boolean(r); }
  if (!o.is_referenced) { o.surface = r_PRC_TYPE_SURF(r, ctx); }
  if (!!o.is_referenced) { o.surface_identifier = B.UnsignedInteger(r); }
  return o;
}
export function r_ContentWireEdge(r, ctx) {
  const o = { _t: "ContentWireEdge" };
  { o.base = r_BaseTopology(r, ctx); }
  { o.ptr_curve = r_PtrCurve(r, ctx); }
  { o.is_trimmed = B.Boolean(r); }
  if (!!o.is_trimmed) { o.trim_interval = r_Interval(r, ctx); }
  return o;
}
export function r_PRC_TYPE_TOPO_WireEdge(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_WireEdge" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 145) throw new Error('PRC_TYPE_TOPO_WireEdge.id: expected 145 got ' + o.id); }
  { o.curve = r_ContentWireEdge(r, ctx); }
  ctx.se(r, 145);
  return o;
}
export function r_PRC_TYPE_TOPO_Edge(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Edge" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 146) throw new Error('PRC_TYPE_TOPO_Edge.id: expected 146 got ' + o.id); }
  { o.wire_edge = r_ContentWireEdge(r, ctx); }
  { o.start_vertex = r_PtrTopology(r, ctx); }
  { o.end_vertex = r_PtrTopology(r, ctx); }
  { o.has_tolerance = B.Boolean(r); }
  if (!!o.has_tolerance) { o.tolerance = B.Double(r); }
  ctx.se(r, 146);
  return o;
}
export function r_PRC_TYPE_TOPO_CoEdge(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_CoEdge" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 147) throw new Error('PRC_TYPE_TOPO_CoEdge.id: expected 147 got ' + o.id); }
  { o.base_tolopogy = r_BaseTopology(r, ctx); }
  { o.ptr_topology = r_PtrTopology(r, ctx); }
  { o.ptr_curves = r_PtrCurve(r, ctx); }
  { o.coedge_orientation = B.Character(r); }
  { o.uv_orientation = B.Character(r); }
  ctx.se(r, 147);
  return o;
}
export function r_CoedgeInLoop(r, ctx) {
  const o = { _t: "CoedgeInLoop" };
  { o.next_coedge = r_PtrTopology(r, ctx); }
  { o.neighbor_index = B.UnsignedInteger(r); }
  return o;
}
export function r_PRC_TYPE_TOPO_Loop(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Loop" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 148) throw new Error('PRC_TYPE_TOPO_Loop.id: expected 148 got ' + o.id); }
  { o.base_tolopogy = r_BaseTopology(r, ctx); }
  { o.loop_orientation = B.Character(r); }
  { o.number_of_coedges = B.UnsignedInteger(r); }
  { const n = o.number_of_coedges; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CoedgeInLoop(r, ctx); o.coedge = a; }
  ctx.se(r, 148);
  return o;
}
export function r_PRC_TYPE_TOPO_Face(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Face" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 149) throw new Error('PRC_TYPE_TOPO_Face.id: expected 149 got ' + o.id); }
  { o.base_tolopogy = r_BaseTopology(r, ctx); }
  { o.surface_geometry = r_PtrSurface(r, ctx); }
  { o.is_trimmed = B.Boolean(r); }
  if (!!o.is_trimmed) { o.trimmed_surface = r_Domain(r, ctx); }
  { o.has_tolerance = B.Boolean(r); }
  if (!!o.has_tolerance) { o.tolerance = B.Double(r); }
  { o.number_of_loops = B.UnsignedInteger(r); }
  { o.index_of_outer_loop = B.Integer(r); }
  { const n = o.number_of_loops; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PtrTopology(r, ctx); o.loops = a; }
  ctx.se(r, 149);
  return o;
}
export function r_FacesInShell(r, ctx) {
  const o = { _t: "FacesInShell" };
  { o.face = r_PtrTopology(r, ctx); }
  { o.orientation = B.Character(r); }
  return o;
}
export function r_PRC_TYPE_TOPO_Shell(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Shell" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 150) throw new Error('PRC_TYPE_TOPO_Shell.id: expected 150 got ' + o.id); }
  { o.base_tolopogy = r_BaseTopology(r, ctx); }
  { o.is_closed = B.Boolean(r); }
  { o.number_of_faces = B.UnsignedInteger(r); }
  { const n = o.number_of_faces; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_FacesInShell(r, ctx); o.faces = a; }
  ctx.se(r, 150);
  return o;
}
export function r_PRC_TYPE_TOPO_Connex(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Connex" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 151) throw new Error('PRC_TYPE_TOPO_Connex.id: expected 151 got ' + o.id); }
  { o.base_tolopogy = r_BaseTopology(r, ctx); }
  { o.number_of_shells = B.UnsignedInteger(r); }
  { const n = o.number_of_shells; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PtrTopology(r, ctx); o.shells = a; }
  ctx.se(r, 151);
  return o;
}
export function r_PRC_TYPE_ROOT(r, ctx) {
  const o = { _t: "PRC_TYPE_ROOT" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 0) throw new Error('PRC_TYPE_ROOT.id: expected 0 got ' + o.id); }
  ctx.se(r, 0);
  return o;
}
export function r_PRC_TYPE_TOPO(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 0: o.id = r_PRC_TYPE_ROOT(r, ctx); break;   case 143: o.id = r_PRC_TYPE_TOPO_MultipleVertex(r, ctx); break;   case 144: o.id = r_PRC_TYPE_TOPO_UniqueVertex(r, ctx); break;   case 145: o.id = r_PRC_TYPE_TOPO_WireEdge(r, ctx); break;   case 146: o.id = r_PRC_TYPE_TOPO_Edge(r, ctx); break;   case 147: o.id = r_PRC_TYPE_TOPO_CoEdge(r, ctx); break;   case 148: o.id = r_PRC_TYPE_TOPO_Loop(r, ctx); break;   case 149: o.id = r_PRC_TYPE_TOPO_Face(r, ctx); break;   case 150: o.id = r_PRC_TYPE_TOPO_Shell(r, ctx); break;   case 151: o.id = r_PRC_TYPE_TOPO_Connex(r, ctx); break;   default: throw new Error('PRC_TYPE_TOPO: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 140);
  return o;
}
export function r_PtrTopology(r, ctx) {
  const o = { _t: "PtrTopology" };
  { o.is_stored = B.Boolean(r); }
  if (!o.is_stored) { o.topo = r_PRC_TYPE_TOPO(r, ctx); }
  if (!!o.is_stored) { o.topo_identifier = B.UnsignedInteger(r); }
  return o;
}
export function r_PRC_TYPE_TOPO_SingleWireBody(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_SingleWireBody" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 153) throw new Error('PRC_TYPE_TOPO_SingleWireBody.id: expected 153 got ' + o.id); }
  { o.base = r_ContentBody(r, ctx); }
  { o.wire_body = r_PtrTopology(r, ctx); }
  ctx.se(r, 153);
  return o;
}
export function r_PRC_TYPE_TOPO_BrepData(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_BrepData" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 154) throw new Error('PRC_TYPE_TOPO_BrepData.id: expected 154 got ' + o.id); }
  { o.base = r_ContentBody(r, ctx); }
  { o.number_of_connex = B.UnsignedInteger(r); }
  { const n = o.number_of_connex; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PtrTopology(r, ctx); o.connex = a; }
  if (ctx.have_bbox(o.base.bounding_box_behavior)) { o.bounding_box = r_BoundingBox(r, ctx); }
  ctx.se(r, 154);
  return o;
}
export function r_CompressedVertex(r, ctx) {
  const o = { _t: "CompressedVertex" };
  { o.already_stored = B.Boolean(r); }
  if (!o.already_stored) { o.point_index = B.UnsignedIntegerWithVariableBitNumber(r, ctx.BrepDataCompress_number_of_bits_to_store_reference); if (!o.already_stored) { ctx.BrepDataCompress_CompressedVertex_get(o.point_index); } }
  if (!!o.already_stored) { o.point_data = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); if (!!o.already_stored) { ctx.BrepDataCompress_CompressedVertex_add(o.point_data); } }
  return o;
}
export function r_ParticularCircle(r, ctx) {
  const o = { _t: "ParticularCircle" };
  { o.full_circle = B.Boolean(r); }
  if (!ctx.is_compressed_iso_spline()) { o.start_end_data = r_StartEndData(r, ctx); }
  if (o.full_circle) { o.center = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  if (o.full_circle) { o.normal = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  if (!o.full_circle) { o.middle_of_arc = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  return o;
}
export function r_GeneralCircle(r, ctx) {
  const o = { _t: "GeneralCircle" };
  if (!ctx.is_compressed_iso_spline()) { o.start_end_data = r_StartEndData(r, ctx); }
  { o.center = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  { o.circle_angle = B.Boolean(r); }
  return o;
}
export function r_StartEndData(r, ctx) {
  const o = { _t: "StartEndData" };
  if (!!ctx.is_curve_trimming_face()) { o.start_vertex = r_CompressedVertex(r, ctx); }
  if (!!ctx.is_curve_trimming_face()) { o.end_vertex = r_CompressedVertex(r, ctx); }
  if (!ctx.is_curve_trimming_face()) { o.start_point = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  if (!ctx.is_curve_trimming_face()) { o.end_point = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  return o;
}
export function r_PRC_HCG_Line(r, ctx) {
  const o = { _t: "PRC_HCG_Line" };
  { o.id = B.CompressedEntityType(r); if (o.id !== 0) throw new Error('PRC_HCG_Line.id: expected 0 got ' + o.id); }
  { o.start_end_data = r_StartEndData(r, ctx); }
  return o;
}
export function r_PRC_HCG_Circle(r, ctx) {
  const o = { _t: "PRC_HCG_Circle" };
  if (!ctx.is_compressed_iso_spline()) { o.id = B.CompressedEntityType(r); if (o.id !== 1) throw new Error('PRC_HCG_Circle.id: expected 1 got ' + o.id); }
  { o.is_particular_circle = B.Boolean(r); }
  if (o.is_particular_circle) { o.particular_circle = r_ParticularCircle(r, ctx); }
  if (!o.is_particular_circle) { o.general_circle = r_GeneralCircle(r, ctx); }
  return o;
}
export function r_PRC_HCG_BSplineHermiteCurve(r, ctx) {
  const o = { _t: "PRC_HCG_BSplineHermiteCurve" };
  { o.id = B.CompressedEntityType(r); if (o.id !== 2) throw new Error('PRC_HCG_BSplineHermiteCurve.id: expected 2 got ' + o.id); }
  { o.start_end_data = r_StartEndData(r, ctx); }
  { o.number_bits = B.UnsignedIntegerWithVariableBitNumber(r, 4); }
  { o.number_points = B.UnsignedIntegerWithVariableBitNumber(r, o.number_bits); }
  { o.point_number_bits = B.UnsignedIntegerWithVariableBitNumber(r, 6); }
  if (o.point_number_bits > 30) { const n = o.number_points - 2; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.points = a; }
  if (o.point_number_bits <= 30) { const n = o.number_points - 2; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Point3DWithVariableBitNumber(r, o.point_number_bits, ctx.brep_data_compressed_tolerance); o.compressed_points = a; }
  { o.tangent_number_bits = B.UnsignedIntegerWithVariableBitNumber(r, 6); }
  if (o.tangent_number_bits > 30) { const n = o.number_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_Vector3D(r, ctx); o.tangents = a; }
  if (o.tangent_number_bits <= 30) { const n = o.number_points; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Point3DWithVariableBitNumber(r, o.tangent_number_bits, ctx.brep_data_compressed_tolerance); o.compressed_tangents = a; }
  return o;
}
export function r_PRC_HCG_CompositeCurve(r, ctx) {
  const o = { _t: "PRC_HCG_CompositeCurve" };
  { o.id = B.CompressedEntityType(r); if (o.id !== 13) throw new Error('PRC_HCG_CompositeCurve.id: expected 13 got ' + o.id); }
  { o.start_end_data = r_StartEndData(r, ctx); }
  { o.dimension = B.UnsignedInteger(r); }
  { o.is_closed = B.Boolean(r); }
  { o.number_of_curves = B.UnsignedInteger(r); }
  { const n = o.number_of_curves; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_RefOrCompressedCurve(r, ctx); o.curves = a; }
  return o;
}
export function r_PRC_HCG_Ellipse(r, ctx) {
  const o = { _t: "PRC_HCG_Ellipse" };
  throw new Error('unsupported PRC_HCG_Ellipse');
  { o.id = B.CompressedEntityType(r); if (o.id !== 12) throw new Error('PRC_HCG_Ellipse.id: expected 12 got ' + o.id); }
  return o;
}
export function r_CompressedCurve(r, ctx) {
  const o = { _t: "CompressedCurve" };
  { const tid = r.peek(() => B.CompressedEntityType(r)); switch (tid.value) {   case 0: o.id = r_PRC_HCG_Line(r, ctx); break;   case 1: o.id = r_PRC_HCG_Circle(r, ctx); break;   case 2: o.id = r_PRC_HCG_BSplineHermiteCurve(r, ctx); break;   case 13: o.id = r_PRC_HCG_CompositeCurve(r, ctx); break;   case 12: o.id = r_PRC_HCG_Ellipse(r, ctx); break;   default: throw new Error('CompressedCurve: unknown subtype ' + JSON.stringify(tid)); } }
  return o;
}
export function r_ContentCompressedIsoFace(r, ctx) {
  const o = { _t: "ContentCompressedIsoFace" };
  { o.orientation_loop_with_surface = B.Boolean(r); }
  { o.first_trim_curve = r_RefOrCompressedCurve(r, ctx); }
  { o.second_trim_curve = r_RefOrCompressedCurve(r, ctx); }
  { o.third_trim_curve_is_not_yet_saved = B.Boolean(r); }
  if (!o.third_trim_curve_is_not_yet_saved) { o.third_trim_curve = B.UnsignedIntegerWithVariableBitNumber(r, ctx.BrepDataCompress_number_of_bits_to_store_reference); }
  { o.fourth_trim_curve_is_not_yet_saved = B.Boolean(r); }
  if (!o.fourth_trim_curve_is_not_yet_saved) { o.fourth_trim_curve = B.UnsignedIntegerWithVariableBitNumber(r, ctx.BrepDataCompress_number_of_bits_to_store_reference); }
  if (o.third_trim_curve_is_not_yet_saved && o.fourth_trim_curve_is_not_yet_saved) { o.common_third_fourth_vertex = r_CompressedVertex(r, ctx); }
  return o;
}
export function r_RefOrCompressedCurve(r, ctx) {
  const o = { _t: "RefOrCompressedCurve" };
  { o.curve_is_not_already_stored = B.Boolean(r); }
  if (!o.curve_is_not_already_stored) { o.index_compressed_curve = B.UnsignedIntegerWithVariableBitNumber(r, ctx.BrepDataCompress_number_of_bits_to_store_reference); }
  if (!!o.curve_is_not_already_stored) { o.compressed_curve = r_CompressedCurve(r, ctx); }
  return o;
}
export function r_AnaFaceTrimLoop(r, ctx) {
  const o = { _t: "AnaFaceTrimLoop" };
  { o.loop_surface_orientation = B.Boolean(r); }
  { const n = 0; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_RefOrCompressedCurve(r, ctx); o.curves = a; }
  return o;
}
export function r_ContentCompressedAnaFace(r, ctx) {
  const o = { _t: "ContentCompressedAnaFace" };
  { o.is_trimmed = B.Boolean(r); }
  if (!!o.is_trimmed) { const n = 0; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_AnaFaceTrimLoop(r, ctx); o.trim_loop = a; }
  if (ctx.ContentCompressedAnaFace_has_point_on_torus(o.is_trimmed)) { o.point_on_torus = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  return o;
}
export function r_ContentCompressedFace(r, ctx) {
  const o = { _t: "ContentCompressedFace" };
  { o.orientation_surface_with_shell = B.Boolean(r); }
  if (ctx.ContentCompressedFace_owner_is_an_iso_face()) { o.iso_face = r_ContentCompressedIsoFace(r, ctx); }
  if (!ctx.ContentCompressedFace_owner_is_an_iso_face()) { o.ana_face = r_ContentCompressedAnaFace(r, ctx); }
  return o;
}
export function r_PRC_HCG_IsoPlane(r, ctx) {
  const o = { _t: "PRC_HCG_IsoPlane" };
  ctx.ContentCompressedFace_owner_enter(true);
  { o.id = B.CompressedEntityType(r); if (o.id !== 2) throw new Error('PRC_HCG_IsoPlane.id: expected 2 got ' + o.id); ctx.push_face_type(o.id); }
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  { o.positive_z = B.Boolean(r); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_IsoCylinder(r, ctx) {
  const o = { _t: "PRC_HCG_IsoCylinder" };
  ctx.ContentCompressedFace_owner_enter(true);
  { o.id = B.CompressedEntityType(r); if (o.id !== 3) throw new Error('PRC_HCG_IsoCylinder.id: expected 3 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_IsoTorus(r, ctx) {
  const o = { _t: "PRC_HCG_IsoTorus" };
  ctx.ContentCompressedFace_owner_enter(true);
  { o.id = B.CompressedEntityType(r); if (o.id !== 4) throw new Error('PRC_HCG_IsoTorus.id: expected 4 got ' + o.id); ctx.push_face_type(o.id); }
  { o.is_major_radius = B.Boolean(r); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_IsoSphere(r, ctx) {
  const o = { _t: "PRC_HCG_IsoSphere" };
  ctx.ContentCompressedFace_owner_enter(true);
  { o.id = B.CompressedEntityType(r); if (o.id !== 5) throw new Error('PRC_HCG_IsoSphere.id: expected 5 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_IsoCone(r, ctx) {
  const o = { _t: "PRC_HCG_IsoCone" };
  ctx.ContentCompressedFace_owner_enter(true);
  { o.id = B.CompressedEntityType(r); if (o.id !== 6) throw new Error('PRC_HCG_IsoCone.id: expected 6 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaPlane(r, ctx) {
  const o = { _t: "PRC_HCG_AnaPlane" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 8) throw new Error('PRC_HCG_AnaPlane.id: expected 8 got ' + o.id); ctx.push_face_type(o.id); }
  { o.x = B.Double(r); }
  { o.y = B.Double(r); }
  { o.facepositive_z = B.Boolean(r); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaCylinder(r, ctx) {
  const o = { _t: "PRC_HCG_AnaCylinder" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 9) throw new Error('PRC_HCG_AnaCylinder.id: expected 9 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  { o.point = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  { o.direction = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaTorus(r, ctx) {
  const o = { _t: "PRC_HCG_AnaTorus" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 10) throw new Error('PRC_HCG_AnaTorus.id: expected 10 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  { o.center = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  { o.x_axis = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  { o.y_axis = r_Vector3D(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaSphere(r, ctx) {
  const o = { _t: "PRC_HCG_AnaSphere" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 11) throw new Error('PRC_HCG_AnaSphere.id: expected 11 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  { o.sphere_center = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaCone(r, ctx) {
  const o = { _t: "PRC_HCG_AnaCone" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 12) throw new Error('PRC_HCG_AnaCone.id: expected 12 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  { o.axis_point = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  { o.apex_point = B.CompressedPoint(r, ctx.brep_data_compressed_tolerance / 100.0); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaNurbs(r, ctx) {
  const o = { _t: "PRC_HCG_AnaNurbs" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 13) throw new Error('PRC_HCG_AnaNurbs.id: expected 13 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  { o.compressed_surface = r_CompressedNurbs(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_PRC_HCG_AnaGenericFace(r, ctx) {
  const o = { _t: "PRC_HCG_AnaGenericFace" };
  ctx.ContentCompressedFace_owner_enter(false);
  { o.id = B.CompressedEntityType(r); if (o.id !== 14) throw new Error('PRC_HCG_AnaGenericFace.id: expected 14 got ' + o.id); ctx.push_face_type(o.id); }
  { o.face = r_ContentCompressedFace(r, ctx); }
  { o.surface_definition = r_PRC_TYPE_SURF(r, ctx); }
  ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_CompressedMultiplicitiesU(r, ctx) {
  const o = { _t: "CompressedMultiplicitiesU" };
  { o.multiplicity_is_not_stored = B.Boolean(r); }
  if (!o.multiplicity_is_not_stored) { o.multiplicity = B.UnsignedIntegerWithVariableBitNumber(r, ctx.compressed_nurbs.number_bits_u); }
  return o;
}
export function r_CompressedMultiplicitiesV(r, ctx) {
  const o = { _t: "CompressedMultiplicitiesV" };
  { o.multiplicity_is_not_stored = B.Boolean(r); }
  if (!o.multiplicity_is_not_stored) { o.multiplicity = B.UnsignedIntegerWithVariableBitNumber(r, ctx.compressed_nurbs.number_bits_v); }
  return o;
}
export function r_InteriorCompressedControlPoints(r, ctx) {
  const o = { _t: "InteriorCompressedControlPoints" };
  { o._type = B.UnsignedIntegerWithVariableBitNumber(r, 2); }
  if (o._type == 1) { o.p1z = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_rest + 1, ctx.nurbs_tolerance); }
  if (o._type == 2) { o.p2x = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_rest + 1, ctx.nurbs_tolerance); }
  if (o._type == 2) { o.p2y = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_rest + 1, ctx.nurbs_tolerance); }
  if (o._type == 3) { o.p3x = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_rest + 1, ctx.nurbs_tolerance); }
  if (o._type == 3) { o.p3y = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_rest + 1, ctx.nurbs_tolerance); }
  if (o._type == 3) { o.p3z = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_rest + 1, ctx.nurbs_tolerance); }
  return o;
}
export function r_CompressedControlPoints(r, ctx) {
  const o = { _t: "CompressedControlPoints" };
  { o.p00 = r_Vector3D(r, ctx); }
  { const n = ctx.compressed_nurbs.number_ccpt_in_v-1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Point3DWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_isomin + 1, ctx.nurbs_tolerance); o.ccpt_in_v = a; }
  { const n = ctx.compressed_nurbs.number_ccpt_in_u-1; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Point3DWithVariableBitNumber(r, ctx.compressed_nurbs.number_of_bits_for_isomin + 1, ctx.nurbs_tolerance); o.ccpt_in_u = a; }
  { const n = (ctx.compressed_nurbs.number_ccpt_in_v-1)*(ctx.compressed_nurbs.number_ccpt_in_u-1); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_InteriorCompressedControlPoints(r, ctx); o.ccpt_interior = a; }
  return o;
}
export function r_CompressedKnot(r, ctx) {
  const o = { _t: "CompressedKnot" };
  if (ctx.compressed_nurbs.number_bit_parameter > 30) { o.knot = B.Double(r); }
  if (ctx.compressed_nurbs.number_bit_parameter <= 30) { o.knot_vbr = B.DoubleWithVariableBitNumber(r, ctx.compressed_nurbs.number_bit_parameter+1, ctx.compressed_nurbs.tolerance_parameter); }
  return o;
}
export function r_CompressedKnotsU(r, ctx) {
  const o = { _t: "CompressedKnotsU" };
  { o.is_unknown_form = B.Boolean(r); }
  if (!o.is_unknown_form) { o.is_pseudo_uniform = B.Boolean(r); }
  { o.number_bit_parameter = B.UnsignedIntegerWithVariableBitNumber(r, 6); ctx.compressed_nurbs.number_bit_parameter = o.number_bit_parameter; ctx.compressed_nurbs.tolerance_parameter = 1.0 / 2.0.powi(o.number_bit_parameter - 1); }
  { const n = ((o.is_pseudo_uniform) ? (2) : (ctx.compressed_nurbs.number_of_knots_in_u)); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedKnot(r, ctx); o.compressed_knots = a; }
  return o;
}
export function r_CompressedKnotsV(r, ctx) {
  const o = { _t: "CompressedKnotsV" };
  { o.is_unknown_form = B.Boolean(r); }
  if (!o.is_unknown_form) { o.is_pseudo_uniform = B.Boolean(r); }
  { o.number_bit_parameter = B.UnsignedIntegerWithVariableBitNumber(r, 6); ctx.compressed_nurbs.number_bit_parameter = o.number_bit_parameter; ctx.compressed_nurbs.tolerance_parameter = 1.0 / 2.0.powi(o.number_bit_parameter - 1); }
  { const n = ((o.is_pseudo_uniform) ? (2) : (ctx.compressed_nurbs.number_of_knots_in_v)); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedKnot(r, ctx); o.compressed_knots = a; }
  return o;
}
export function r_CompressedKnotVectorU(r, ctx) {
  const o = { _t: "CompressedKnotVectorU" };
  { o.is_uniform = B.Boolean(r); }
  if (!o.is_uniform) { o.knots = r_CompressedKnotsU(r, ctx); }
  return o;
}
export function r_CompressedKnotVectorV(r, ctx) {
  const o = { _t: "CompressedKnotVectorV" };
  { o.is_uniform = B.Boolean(r); }
  if (!o.is_uniform) { o.knots = r_CompressedKnotsV(r, ctx); }
  return o;
}
export function r_CompressedWeights(r, ctx) {
  const o = { _t: "CompressedWeights" };
  { o.number_bit_weight = B.UnsignedIntegerWithVariableBitNumber(r, 6); }
  if (o.number_bit_weight > 30) { const n = ctx.compressed_nurbs.number_ccpt_in_u * ctx.compressed_nurbs.number_ccpt_in_v; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Double(r); o.weights = a; }
  if (o.number_bit_weight <= 30) { o.weight_tolerance = B.Double(r); }
  if (o.number_bit_weight <= 30) { const n = ctx.compressed_nurbs.number_ccpt_in_u * ctx.compressed_nurbs.number_ccpt_in_v; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.DoubleWithVariableBitNumber(r, o.number_bit_weight + 1, o.weight_tolerance); o.compressed_weights = a; }
  return o;
}
export function r_CompressedNurbs(r, ctx) {
  const o = { _t: "CompressedNurbs" };
  { o.degree_in_u = B.UnsignedIntegerWithVariableBitNumber(r, 5); }
  { o.degree_in_v = B.UnsignedIntegerWithVariableBitNumber(r, 5); }
  { o.number_stored_knots_in_u = B.UnsignedIntegerWithVariableBitNumber(r, 16); ctx.compressed_nurbs.set0(o.degree_in_u, o.degree_in_v, o.number_stored_knots_in_u); }
  { const n = o.number_stored_knots_in_u; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedMultiplicitiesU(r, ctx); o.mult_u = a; }
  { o.number_stored_knots_in_v = B.UnsignedIntegerWithVariableBitNumber(r, 16); ctx.compressed_nurbs.set1(o.mult_u, o.number_stored_knots_in_v); }
  { const n = o.number_stored_knots_in_v; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedMultiplicitiesV(r, ctx); o.mult_v = a; ctx.compressed_nurbs.set2(o.mult_v); }
  { o.is_closed_in_u = B.Boolean(r); }
  { o.is_closed_in_v = B.Boolean(r); }
  { o.number_of_bits_for_isomin = B.UnsignedIntegerWithVariableBitNumber(r, 20); ctx.compressed_nurbs.number_of_bits_for_isomin = o.number_of_bits_for_isomin; }
  { o.number_of_bits_for_rest = B.UnsignedIntegerWithVariableBitNumber(r, 20); ctx.compressed_nurbs.set3(o.is_closed_in_u, o.is_closed_in_v, o.number_of_bits_for_isomin, o.number_of_bits_for_rest); }
  { o.compressed_control_points = r_CompressedControlPoints(r, ctx); ctx.compressed_nurbs.set4(o.compressed_control_points); }
  { o.knot_vector_u = r_CompressedKnotVectorU(r, ctx); ctx.compressed_nurbs.set5(o.knot_vector_u); }
  { o.knot_vector_v = r_CompressedKnotVectorV(r, ctx); ctx.compressed_nurbs.set6(o.knot_vector_v); }
  { o.is_rational = B.Boolean(r); }
  if (!!o.is_rational) { o.weights = r_CompressedWeights(r, ctx); }
  return o;
}
export function r_IsoNurbsTrimCrv(r, ctx) {
  const o = { _t: "IsoNurbsTrimCrv" };
  { o.iso_boundary = B.Boolean(r); }
  if (!o.iso_boundary) { o.is_a_circle = B.Boolean(r); }
  if (!o.iso_boundary && o.is_a_circle) { o.compressed_circle = r_PRC_HCG_Circle(r, ctx); }
  return o;
}
export function r_IsoNurbsTrimCurve(r, ctx) {
  const o = { _t: "IsoNurbsTrimCurve" };
  { o.is_referenced = B.Boolean(r); }
  if (o.is_referenced) { o.trim_curve_index = B.UnsignedIntegerWithVariableBitNumber(r, ctx.BrepDataCompress_number_of_bits_to_store_reference); }
  if (!o.is_referenced) { o.trim_curve = r_IsoNurbsTrimCrv(r, ctx); }
  return o;
}
export function r_PRC_HCG_IsoNurbs(r, ctx) {
  const o = { _t: "PRC_HCG_IsoNurbs" };
  ctx.set_compressed_iso_spline(true); ctx.ContentCompressedFace_owner_enter(true);
  { o.id = B.CompressedEntityType(r); if (o.id !== 7) throw new Error('PRC_HCG_IsoNurbs.id: expected 7 got ' + o.id); ctx.push_face_type(o.id); }
  { o.orientation_surface_with_shell = B.Boolean(r); }
  { o.orientation_loop_with_surface = B.Boolean(r); }
  { const a = []; for (let i = 0; i < 3; i++) a.push(B.Boolean(r)); o.sense_array = a; }
  { o.surface = r_CompressedNurbs(r, ctx); }
  { o.curve0 = r_IsoNurbsTrimCurve(r, ctx); }
  { o.curve1 = r_IsoNurbsTrimCurve(r, ctx); }
  { o.curve2 = r_IsoNurbsTrimCurve(r, ctx); }
  { o.curve3 = r_IsoNurbsTrimCurve(r, ctx); }
  if (!o.curve3.is_referenced && !o.curve0.is_referenced) { o.loop_vertex3 = r_CompressedVertex(r, ctx); }
  if (!o.curve0.is_referenced && !o.curve1.is_referenced) { o.loop_vertex0 = r_CompressedVertex(r, ctx); }
  if (!o.curve1.is_referenced && !o.curve2.is_referenced) { o.loop_vertex1 = r_CompressedVertex(r, ctx); }
  if (!o.curve2.is_referenced && !o.curve3.is_referenced) { o.loop_vertex2 = r_CompressedVertex(r, ctx); }
  ctx.set_compressed_iso_spline(false); ctx.pop_face_type(); ctx.ContentCompressedFace_owner_leave();
  return o;
}
export function r_CompressedFace(r, ctx) {
  const o = { _t: "CompressedFace" };
  { const tid = r.peek(() => B.CompressedEntityType(r)); switch (tid.value) {   case 2: o.id = r_PRC_HCG_IsoPlane(r, ctx); break;   case 3: o.id = r_PRC_HCG_IsoCylinder(r, ctx); break;   case 4: o.id = r_PRC_HCG_IsoTorus(r, ctx); break;   case 5: o.id = r_PRC_HCG_IsoSphere(r, ctx); break;   case 6: o.id = r_PRC_HCG_IsoCone(r, ctx); break;   case 7: o.id = r_PRC_HCG_IsoNurbs(r, ctx); break;   case 8: o.id = r_PRC_HCG_AnaPlane(r, ctx); break;   case 9: o.id = r_PRC_HCG_AnaCylinder(r, ctx); break;   case 10: o.id = r_PRC_HCG_AnaTorus(r, ctx); break;   case 11: o.id = r_PRC_HCG_AnaSphere(r, ctx); break;   case 12: o.id = r_PRC_HCG_AnaCone(r, ctx); break;   case 13: o.id = r_PRC_HCG_AnaNurbs(r, ctx); break;   case 14: o.id = r_PRC_HCG_AnaGenericFace(r, ctx); break;   default: throw new Error('CompressedFace: unknown subtype ' + JSON.stringify(tid)); } }
  return o;
}
export function r_CompressedShell(r, ctx) {
  const o = { _t: "CompressedShell" };
  { o.single_face = B.Boolean(r); }
  if (!o.single_face) { o.number_of_faces = B.NumberOfBitsThenUnsignedInteger(r); ctx.BrepDataCompress_register_faces(((!!o.single_face) ? (1) : (o.number_of_faces))); }
  { const n = ((!!o.single_face) ? (1) : (o.number_of_faces)); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedFace(r, ctx); o.faces = a; }
  { const n = ((!!o.single_face) ? (1) : (o.number_of_faces)); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = B.Boolean(r); o.is_an_iso_face = a; ctx.CompressedShell_reorder_faces(); }
  return o;
}
export function r_CompressedConnex(r, ctx) {
  const o = { _t: "CompressedConnex" };
  { o.number_of_shells = B.NumberOfBitsThenUnsignedInteger(r); }
  { const n = o.number_of_shells; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedShell(r, ctx); o.shells = a; }
  return o;
}
export function r_MultipleCompressedConnex(r, ctx) {
  const o = { _t: "MultipleCompressedConnex" };
  { o.number_of_connex = B.NumberOfBitsThenUnsignedInteger(r); }
  { const n = o.number_of_connex; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_CompressedConnex(r, ctx); o.connex = a; }
  return o;
}
export function r_PRC_TYPE_TOPO_SingleWireBodyCompress(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_SingleWireBodyCompress" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 155) throw new Error('PRC_TYPE_TOPO_SingleWireBodyCompress.id: expected 155 got ' + o.id); }
  { o.base = r_ContentBody(r, ctx); }
  { o.curve_tolerance = B.Double(r); ctx.brep_data_compressed_tolerance = o.curve_tolerance; ctx.nurbs_tolerance = ctx.brep_data_compressed_tolerance / 5.0; }
  { o.unknown = B.Boolean(r); }
  { o.compressed_curve = r_CompressedCurve(r, ctx); }
  ctx.se(r, 155);
  return o;
}
export function r_PRC_TYPE_TOPO_BrepDataCompress(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_BrepDataCompress" };
  ctx.BrepDataCompress_enter();
  { o.id = B.UnsignedInteger(r); if (o.id !== 156) throw new Error('PRC_TYPE_TOPO_BrepDataCompress.id: expected 156 got ' + o.id); }
  { o.base = r_ContentBody(r, ctx); }
  { o.brep_data_compressed_tolerance = B.Double(r); ctx.brep_data_compressed_tolerance = o.brep_data_compressed_tolerance; ctx.nurbs_tolerance = ctx.brep_data_compressed_tolerance / 5.0; }
  { o.number_of_bits_to_store_reference = B.NumberOfBitsThenUnsignedInteger(r); ctx.BrepDataCompress_number_of_bits_to_store_reference = o.number_of_bits_to_store_reference; }
  { o.number_vertex_references = B.UnsignedIntegerWithVariableBitNumber(r, o.number_of_bits_to_store_reference); }
  { o.number_edge_references = B.UnsignedIntegerWithVariableBitNumber(r, o.number_of_bits_to_store_reference); }
  { o.single_connex = B.Boolean(r); }
  if (!!o.single_connex) { o.single = r_CompressedShell(r, ctx); }
  if (!o.single_connex) { o.multi = r_MultipleCompressedConnex(r, ctx); }
  { const n = ctx.BrepDataCompress_get_sum_num_faces(); if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_BaseTopology(r, ctx); o.base_topology_data = a; }
  ctx.se(r, 156);
  ctx.BrepDataCompress_leave();
  return o;
}
export function r_PRC_TYPE_TOPO_Body(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Body" };
  { const tid = r.peek(() => B.UnsignedInteger(r)); switch (tid) {   case 153: o.id = r_PRC_TYPE_TOPO_SingleWireBody(r, ctx); break;   case 154: o.id = r_PRC_TYPE_TOPO_BrepData(r, ctx); break;   case 155: o.id = r_PRC_TYPE_TOPO_SingleWireBodyCompress(r, ctx); break;   case 156: o.id = r_PRC_TYPE_TOPO_BrepDataCompress(r, ctx); break;   default: throw new Error('PRC_TYPE_TOPO_Body: unknown subtype ' + JSON.stringify(tid)); } }
  ctx.se(r, 152);
  return o;
}
export function r_PRC_TYPE_TOPO_Context(r, ctx) {
  const o = { _t: "PRC_TYPE_TOPO_Context" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 141) throw new Error('PRC_TYPE_TOPO_Context.id: expected 141 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.behavior = B.Character(r); }
  { o.granularity = B.Double(r); }
  { o.tolerance = B.Double(r); }
  { o.has_face_thickness = B.Boolean(r); }
  if (!!o.has_face_thickness) { o.face_thicknes = B.Double(r); }
  { o.has_scale = B.Boolean(r); }
  if (!!o.has_scale) { o.scale = B.Double(r); }
  { o.number_of_bodies = B.UnsignedInteger(r); }
  { const n = o.number_of_bodies; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_TOPO_Body(r, ctx); o.bodies = a; }
  ctx.se(r, 141);
  return o;
}
export function r_FileStructureExactGeometry(r, ctx) {
  const o = { _t: "FileStructureExactGeometry" };
  { o.topo_context_count = B.UnsignedInteger(r); }
  { const n = o.topo_context_count; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = r_PRC_TYPE_TOPO_Context(r, ctx); o.topo_contexts = a; }
  return o;
}
export function r_PRC_TYPE_ASM_FileStructureGeometry(r, ctx) {
  const o = { _t: "PRC_TYPE_ASM_FileStructureGeometry" };
  { o.id = B.UnsignedInteger(r); if (o.id !== 306) throw new Error('PRC_TYPE_ASM_FileStructureGeometry.id: expected 306 got ' + o.id); }
  { o.base = r_ContentPRCBase(r, ctx); }
  { o.exact_geometry = r_FileStructureExactGeometry(r, ctx); }
  ctx.se(r, 306);
  { o.user_data = B.UserData(r); }
  return o;
}
export const PRC_TYPE = {"PRC_TYPE_ROOT": 0, "PRC_TYPE_ROOT_PRCBase": 1, "PRC_TYPE_ROOT_PRCBaseWithGraphics": 2, "PRC_TYPE_CRV": 10, "PRC_TYPE_SURF": 75, "PRC_TYPE_TOPO": 140, "PRC_TYPE_TESS": 170, "PRC_TYPE_MISC": 200, "PRC_TYPE_RI": 230, "PRC_TYPE_ASM": 300, "PRC_TYPE_MKP": 500, "PRC_TYPE_GRAPH": 700, "PRC_TYPE_MATH": 900, "PRC_TYPE_CRV_Base": 11, "PRC_TYPE_CRV_Blend02Boundary": 12, "PRC_TYPE_CRV_NURBS": 13, "PRC_TYPE_CRV_Circle": 14, "PRC_TYPE_CRV_Composite": 15, "PRC_TYPE_CRV_OnSurf": 16, "PRC_TYPE_CRV_Ellipse": 17, "PRC_TYPE_CRV_Equation": 18, "PRC_TYPE_CRV_Helix": 19, "PRC_TYPE_CRV_Hyperbola": 20, "PRC_TYPE_CRV_Intersection": 21, "PRC_TYPE_CRV_Line": 22, "PRC_TYPE_CRV_Offset": 23, "PRC_TYPE_CRV_Parabola": 24, "PRC_TYPE_CRV_PolyLine": 25, "PRC_TYPE_CRV_Transform": 26, "PRC_TYPE_SURF_Base": 76, "PRC_TYPE_SURF_Blend01": 77, "PRC_TYPE_SURF_Blend02": 78, "PRC_TYPE_SURF_Blend03": 79, "PRC_TYPE_SURF_NURBS": 80, "PRC_TYPE_SURF_Cone": 81, "PRC_TYPE_SURF_Cylinder": 82, "PRC_TYPE_SURF_Cylindrical": 83, "PRC_TYPE_SURF_Offset": 84, "PRC_TYPE_SURF_Pipe": 85, "PRC_TYPE_SURF_Plane": 86, "PRC_TYPE_SURF_Ruled": 87, "PRC_TYPE_SURF_Sphere": 88, "PRC_TYPE_SURF_Revolution": 89, "PRC_TYPE_SURF_Extrusion": 90, "PRC_TYPE_SURF_FromCurves": 91, "PRC_TYPE_SURF_Torus": 92, "PRC_TYPE_SURF_Transform": 93, "PRC_TYPE_SURF_Blend04": 94, "PRC_TYPE_TOPO_Context": 141, "PRC_TYPE_TOPO_Item": 142, "PRC_TYPE_TOPO_MultipleVertex": 143, "PRC_TYPE_TOPO_UniqueVertex": 144, "PRC_TYPE_TOPO_WireEdge": 145, "PRC_TYPE_TOPO_Edge": 146, "PRC_TYPE_TOPO_CoEdge": 147, "PRC_TYPE_TOPO_Loop": 148, "PRC_TYPE_TOPO_Face": 149, "PRC_TYPE_TOPO_Shell": 150, "PRC_TYPE_TOPO_Connex": 151, "PRC_TYPE_TOPO_Body": 152, "PRC_TYPE_TOPO_SingleWireBody": 153, "PRC_TYPE_TOPO_BrepData": 154, "PRC_TYPE_TOPO_SingleWireBodyCompress": 155, "PRC_TYPE_TOPO_BrepDataCompress": 156, "PRC_TYPE_TOPO_WireBody": 157, "PRC_TYPE_TESS_Base": 171, "PRC_TYPE_TESS_3D": 172, "PRC_TYPE_TESS_3D_Compressed": 173, "PRC_TYPE_TESS_Face": 174, "PRC_TYPE_TESS_3D_Wire": 175, "PRC_TYPE_TESS_Markup": 176, "PRC_TYPE_MISC_Attribute": 201, "PRC_TYPE_MISC_CartesianTransformation": 202, "PRC_TYPE_MISC_EntityReference": 203, "PRC_TYPE_MISC_MarkupLinkedItem": 204, "PRC_TYPE_MISC_ReferenceOnPRCBase": 205, "PRC_TYPE_MISC_ReferenceOnTopology": 206, "PRC_TYPE_MISC_GeneralTransformation": 207, "PRC_TYPE_RI_RepresentationItem": 231, "PRC_TYPE_RI_BrepModel": 232, "PRC_TYPE_RI_Curve": 233, "PRC_TYPE_RI_Direction": 234, "PRC_TYPE_RI_Plane": 235, "PRC_TYPE_RI_PointSet": 236, "PRC_TYPE_RI_PolyBrepModel": 237, "PRC_TYPE_RI_PolyWire": 238, "PRC_TYPE_RI_Set": 239, "PRC_TYPE_RI_CoordinateSystem": 240, "PRC_TYPE_ASM_ModelFile": 301, "PRC_TYPE_ASM_FileStructure": 302, "PRC_TYPE_ASM_FileStructureGlobals": 303, "PRC_TYPE_ASM_FileStructureTree": 304, "PRC_TYPE_ASM_FileStructureTessellation": 305, "PRC_TYPE_ASM_FileStructureGeometry": 306, "PRC_TYPE_ASM_FileStructureExtraGeometry": 307, "PRC_TYPE_ASM_ProductOccurrence": 310, "PRC_TYPE_ASM_PartDefinition": 311, "PRC_TYPE_ASM_Filter": 320, "PRC_TYPE_MKP_View": 501, "PRC_TYPE_MKP_Markup": 502, "PRC_TYPE_MKP_Leader": 503, "PRC_TYPE_MKP_AnnotationItem": 504, "PRC_TYPE_MKP_AnnotationSet": 505, "PRC_TYPE_MKP_AnnotationReference": 506, "PRC_TYPE_GRAPH_Style": 701, "PRC_TYPE_GRAPH_Material": 702, "PRC_TYPE_GRAPH_Picture": 703, "PRC_TYPE_GRAPH_TextureApplication": 711, "PRC_TYPE_GRAPH_TextureDefinition": 712, "PRC_TYPE_GRAPH_TextureTransformation": 713, "PRC_TYPE_GRAPH_LinePattern": 721, "PRC_TYPE_GRAPH_FillPattern": 722, "PRC_TYPE_GRAPH_DottingPattern": 723, "PRC_TYPE_GRAPH_HatchingPattern": 724, "PRC_TYPE_GRAPH_SolidPattern": 725, "PRC_TYPE_GRAPH_VPicturePattern": 726, "PRC_TYPE_GRAPH_AmbientLight": 731, "PRC_TYPE_GRAPH_PointLight": 732, "PRC_TYPE_GRAPH_DirectionalLight": 733, "PRC_TYPE_GRAPH_SpotLight": 734, "PRC_TYPE_GRAPH_SceneDisplayParameters": 741, "PRC_TYPE_GRAPH_Camera": 742, "PRC_TYPE_MATH_FCT_1D": 901, "PRC_TYPE_MATH_FCT_1D_Polynom": 902, "PRC_TYPE_MATH_FCT_1D_Trigonometric": 903, "PRC_TYPE_MATH_FCT_1D_Fraction": 904, "PRC_TYPE_MATH_FCT_1D_ArctanCos": 905, "PRC_TYPE_MATH_FCT_1D_Combination": 906, "PRC_TYPE_MATH_FCT_3D": 910, "PRC_TYPE_MATH_FCT_3D_Linear": 911, "PRC_TYPE_MATH_FCT_3D_NonLinear": 912};
