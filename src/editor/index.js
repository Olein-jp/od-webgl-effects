import { dispatch } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useEffect, useRef, useState, Fragment } from '@wordpress/element';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	Button,
	Notice,
	ColorPalette,
	RangeControl,
	TextControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { labels } from '../effects/labels';
import { effects } from '../effects';
import {
	normalize,
	commonControls,
	switchEffect,
	applyPreset,
	saveUserPreset,
} from '../effects/settings';
import { getManager } from '../frontend/manager';
import { Control } from './controls';
const config = window.odWebglConfig || { blocks: [], defaults: {} };
const supported = ( name ) => config.blocks.includes( name );
addFilter(
	'blocks.registerBlockType',
	'od-webgl/attributes',
	( settings, name ) =>
		supported( name )
			? {
					...settings,
					attributes: {
						...settings.attributes,
						odWebgl: { type: 'object' },
					},
				}
			: settings
);
function Preview( { clientId, raw, live } ) {
	const ref = useRef();
	const current = useRef();
	useEffect( () => {
		const root = ref.current?.ownerDocument.querySelector(
			'[data-block="' + clientId + '"]'
		);
		if ( ! root ) return;
		const manager = getManager( root.ownerDocument );
		current.current = { root, manager };
		return () => {
			manager.remove( root );
			current.current = null;
		};
	}, [ clientId ] );
	useEffect( () => {
		const entry = current.current;
		if ( ! entry ) return;
		const valid = normalize( raw, effects );
		if ( valid ) {
			entry.manager.update( entry.root, valid, live );
		} else {
			entry.manager.remove( entry.root );
		}
	}, [ raw, live ] );
	return <span hidden ref={ ref } />;
}
function Panel( { attributes, setAttributes, isSelected, clientId } ) {
	const raw = attributes.odWebgl;
	const fallback = {
		...config.defaults,
		enabled: true,
		effect: config.defaults.effect || 'aurora',
	};
	const valid = normalize( raw || fallback, effects );
	const state = valid || normalize( fallback, effects );
	const [ mode, setMode ] = useState( 'static' );
	const [ presetName, setPresetName ] = useState( '' );
	const [ theme, defaults, custom ] = useSettings(
		'color.palette.theme',
		'color.palette.default',
		'color.palette.custom'
	);
	const colors = [
		...( theme || [] ),
		...( custom || [] ),
		...( defaults || [] ),
	];
	const effect = effects.get( state.effect );
	const categories = {
		fluid: __( 'Fluid & Gradient', 'od-webgl-effects' ),
		geometry: __( 'Waves & Geometry', 'od-webgl-effects' ),
		particles: __( 'Particles', 'od-webgl-effects' ),
	};
	const availablePresets = [
		...effect.presets,
		...( state.userPresets || [] ).filter(
			( p ) => p.effect === state.effect
		),
	];
	const commitSettings = ( value ) => {
		// Discrete inspector actions must not merge as edits to the same object attribute.
		dispatch(
			'core/block-editor'
		).__unstableMarkLastChangeAsPersistent?.();
		setAttributes( { odWebgl: value } );
	};
	const patch = ( part ) =>
		commitSettings( { ...( raw || state ), ...part, version: 1 } );
	const setting = ( id, value ) =>
		patch( { settings: { ...state.settings, [ id ]: value }, preset: '' } );
	const performance = ( id, value ) =>
		patch( { performance: { ...state.performance, [ id ]: value } } );
	const setEffect = ( id ) => patch( switchEffect( state, id, effects ) );
	const chooseColor = ( value ) => {
		const match = colors.find(
			( c ) => c.color.toLowerCase() === value?.toLowerCase()
		);
		return match?.slug
			? `var(--wp--preset--color--${ match.slug })`
			: value;
	};
	const resolveColor = ( value ) =>
		value?.startsWith( 'var(' )
			? colors.find(
					( c ) => value === `var(--wp--preset--color--${ c.slug })`
				)?.color
			: value;
	const qualityOptions = [
		{ label: __( 'Auto', 'od-webgl-effects' ), value: 'auto' },
		{ label: __( 'Low', 'od-webgl-effects' ), value: 'low' },
		{ label: __( 'Medium', 'od-webgl-effects' ), value: 'medium' },
		{ label: __( 'High', 'od-webgl-effects' ), value: 'high' },
	];
	return (
		<Fragment>
			<Preview
				clientId={ clientId }
				raw={ raw }
				live={ isSelected && mode === 'live' }
			/>
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'WebGL background', 'od-webgl-effects' ) }
					initialOpen={ false }
					className="od-webgl-controls"
				>
					<ToggleControl
						label={ __(
							'Enable WebGL background',
							'od-webgl-effects'
						) }
						checked={ raw?.enabled === true }
						onChange={ ( enabled ) => patch( { enabled } ) }
					/>
					{ raw && ! valid && raw.enabled && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'Unsupported settings. Reset to edit safely.',
								'od-webgl-effects'
							) }
							<Button
								variant="secondary"
								onClick={ () => commitSettings( fallback ) }
							>
								{ __( 'Reset', 'od-webgl-effects' ) }
							</Button>
						</Notice>
					) }
					{ raw?.enabled && valid && (
						<>
							<SelectControl
								label={ __( 'Category', 'od-webgl-effects' ) }
								value={ effect.category }
								options={ [
									...new Set(
										effects
											.getAll()
											.map( ( e ) => e.category )
									),
								].map( ( value ) => ( {
									value,
									label: categories[ value ] || value,
								} ) ) }
								onChange={ ( category ) =>
									setEffect(
										effects
											.getAll()
											.find(
												( e ) => e.category === category
											).id
									)
								}
							/>
							<SelectControl
								label={ __( 'Effect', 'od-webgl-effects' ) }
								value={ state.effect }
								options={ effects
									.getAll()
									.filter(
										( e ) => e.category === effect.category
									)
									.map( ( e ) => ( {
										label: e.label,
										value: e.id,
									} ) ) }
								onChange={ setEffect }
							/>
							<div
								className="od-webgl-picker"
								role="group"
								aria-label={ __(
									'Effect thumbnails',
									'od-webgl-effects'
								) }
							>
								{ effects
									.getAll()
									.filter(
										( e ) => e.category === effect.category
									)
									.map( ( e ) => (
										<Button
											key={ e.id }
											variant="secondary"
											aria-pressed={
												e.id === state.effect
											}
											onClick={ () => setEffect( e.id ) }
										>
											<img
												src={
													config.assetsUrl +
													e.thumbnail
												}
												alt=""
											/>
											<span>{ e.label }</span>
										</Button>
									) ) }
							</div>
							<img
								className="od-webgl-thumbnail"
								src={ config.assetsUrl + effect.thumbnail }
								alt=""
							/>
							<SelectControl
								label={ __( 'Preset', 'od-webgl-effects' ) }
								value={ state.preset || '' }
								options={ [
									{
										label: __(
											'Custom',
											'od-webgl-effects'
										),
										value: '',
									},
									...availablePresets.map( ( p ) => ( {
										label:
											p.name ||
											labels[ p.label ] ||
											p.label,
										value: p.id,
									} ) ),
								] }
								onChange={ ( id ) => {
									const preset = availablePresets.find(
										( p ) => p.id === id
									);
									if ( preset )
										patch(
											applyPreset(
												state,
												preset,
												effects
											)
										);
								} }
							/>
							<TextControl
								label={ __(
									'Preset name',
									'od-webgl-effects'
								) }
								value={ presetName }
								onChange={ setPresetName }
								help={ __(
									'Saved in this block. Up to 10 presets.',
									'od-webgl-effects'
								) }
							/>
							<Button
								variant="secondary"
								disabled={
									! presetName.trim() ||
									( state.userPresets || [] ).length >= 10
								}
								onClick={ () => {
									commitSettings(
										saveUserPreset(
											state,
											presetName,
											'user-' + Date.now().toString( 36 ),
											effects
										)
									);
									setPresetName( '' );
								} }
							>
								{ __(
									'Save block preset',
									'od-webgl-effects'
								) }
							</Button>
							<Button
								variant="tertiary"
								disabled={
									! ( state.userPresets || [] ).some(
										( p ) => p.id === state.preset
									)
								}
								onClick={ () =>
									patch( {
										userPresets: state.userPresets.filter(
											( p ) => p.id !== state.preset
										),
										preset: '',
									} )
								}
							>
								{ __(
									'Delete block preset',
									'od-webgl-effects'
								) }
							</Button>
							<Button
								variant="tertiary"
								onClick={ () =>
									patch(
										applyPreset(
											state,
											{
												id: '',
												settings: effect.defaults,
											},
											effects
										)
									)
								}
							>
								{ __(
									'Reset effect settings',
									'od-webgl-effects'
								) }
							</Button>
							{ state.settings.colors.map( ( value, index ) => (
								<fieldset key={ index }>
									<legend>
										{ sprintf(
											// translators: %d: color position in the effect palette.
											__(
												'Color %d',
												'od-webgl-effects'
											),
											index + 1
										) }
									</legend>
									<ColorPalette
										colors={ colors }
										value={ resolveColor( value ) }
										clearable={ false }
										onChange={ ( color ) =>
											setting(
												'colors',
												state.settings.colors.map(
													( c, i ) =>
														i === index
															? chooseColor(
																	color
																)
															: c
												)
											)
										}
									/>
								</fieldset>
							) ) }
							<div className="od-webgl-colors">
								<Button
									variant="secondary"
									disabled={
										state.settings.colors.length >= 5
									}
									onClick={ () =>
										setting( 'colors', [
											...state.settings.colors,
											'#ffffff',
										] )
									}
								>
									{ __( 'Add color', 'od-webgl-effects' ) }
								</Button>
								<Button
									variant="tertiary"
									disabled={
										state.settings.colors.length <= 2
									}
									onClick={ () =>
										setting(
											'colors',
											state.settings.colors.slice( 0, -1 )
										)
									}
								>
									{ __( 'Remove color', 'od-webgl-effects' ) }
								</Button>
							</div>
							{ commonControls.map( ( control ) => (
								<Control
									key={ control.id }
									control={ control }
									value={ state.settings[ control.id ] }
									onChange={ ( value ) =>
										setting( control.id, value )
									}
									colors={ colors }
								/>
							) ) }
							<PanelBody
								title={ __(
									'Effect details',
									'od-webgl-effects'
								) }
								initialOpen={ false }
							>
								{ effect.controls
									.filter(
										( c ) =>
											! c.dependsOn ||
											state.settings[ c.dependsOn ] ===
												true
									)
									.map( ( control ) => (
										<Control
											key={ control.id }
											control={ control }
											value={
												state.settings[ control.id ]
											}
											onChange={ ( value ) =>
												setting( control.id, value )
											}
											colors={ colors }
										/>
									) ) }
							</PanelBody>
							<SelectControl
								label={ __(
									'Editor preview',
									'od-webgl-effects'
								) }
								value={ mode }
								options={ [
									{
										label: __(
											'Static',
											'od-webgl-effects'
										),
										value: 'static',
									},
									{
										label: __(
											'Live while selected',
											'od-webgl-effects'
										),
										value: 'live',
									},
									{
										label: __(
											'Stopped',
											'od-webgl-effects'
										),
										value: 'stopped',
									},
								] }
								onChange={ setMode }
							/>
							<PanelBody
								title={ __(
									'Performance',
									'od-webgl-effects'
								) }
								initialOpen={ false }
							>
								<SelectControl
									label={ __(
										'Quality',
										'od-webgl-effects'
									) }
									value={ state.performance.quality }
									options={ qualityOptions }
									onChange={ ( v ) =>
										performance( 'quality', v )
									}
								/>
								<SelectControl
									label={ __(
										'Mobile quality',
										'od-webgl-effects'
									) }
									value={ state.performance.mobileQuality }
									options={ qualityOptions }
									onChange={ ( v ) =>
										performance( 'mobileQuality', v )
									}
								/>
								<RangeControl
									label={ __(
										'Maximum FPS',
										'od-webgl-effects'
									) }
									value={ state.performance.maxFps }
									min={ 1 }
									max={ 60 }
									onChange={ ( v ) =>
										performance( 'maxFps', v )
									}
								/>
								<ToggleControl
									label={ __(
										'Static on published page',
										'od-webgl-effects'
									) }
									checked={ state.performance.paused }
									onChange={ ( v ) =>
										performance( 'paused', v )
									}
								/>
							</PanelBody>
							<fieldset>
								<legend>
									{ __(
										'Fallback background',
										'od-webgl-effects'
									) }
								</legend>
								<ColorPalette
									colors={ colors }
									value={ resolveColor(
										state.fallback.color
									) }
									clearable={ false }
									onChange={ ( value ) =>
										patch( {
											fallback: {
												color: chooseColor( value ),
											},
										} )
									}
								/>
							</fieldset>
							<Notice status="info" isDismissible={ false }>
								{ __(
									'Check text contrast. Reduced motion uses the fallback color.',
									'od-webgl-effects'
								) }
							</Notice>
							{ attributes.url && (
								<Notice status="info" isDismissible={ false }>
									{ __(
										'Cover media is hidden while WebGL is enabled. Its settings are preserved.',
										'od-webgl-effects'
									) }
								</Notice>
							) }
						</>
					) }
				</PanelBody>
			</InspectorControls>
		</Fragment>
	);
}
addFilter(
	'editor.BlockEdit',
	'od-webgl/inspector',
	createHigherOrderComponent(
		( BlockEdit ) => ( props ) => (
			<>
				<BlockEdit { ...props } />
				{ supported( props.name ) && <Panel { ...props } /> }
			</>
		),
		'withODWebGL'
	)
);

addFilter(
	'editor.BlockListBlock',
	'od-webgl/preview-wrapper',
	createHigherOrderComponent(
		( BlockListBlock ) => ( props ) => {
			const state = supported( props.name )
				? normalize( props.attributes?.odWebgl, effects )
				: null;
			if ( ! state ) return <BlockListBlock { ...props } />;
			return (
				<BlockListBlock
					{ ...props }
					className={ [ props.className, 'has-od-webgl' ]
						.filter( Boolean )
						.join( ' ' ) }
					wrapperProps={ {
						...props.wrapperProps,
						style: {
							...props.wrapperProps?.style,
							'--od-webgl-fallback': state.fallback.color,
						},
					} }
				/>
			);
		},
		'withODWebGLPreview'
	)
);
