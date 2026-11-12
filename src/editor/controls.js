import {
	RangeControl,
	SelectControl,
	ToggleControl,
	TextControl,
	ColorPalette,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
const labels = () => ( {
	Speed: __( 'Speed', 'od-webgl-effects' ),
	Intensity: __( 'Intensity', 'od-webgl-effects' ),
	Opacity: __( 'Opacity', 'od-webgl-effects' ),
	'Noise scale': __( 'Noise scale', 'od-webgl-effects' ),
	Glow: __( 'Glow', 'od-webgl-effects' ),
	Direction: __( 'Direction', 'od-webgl-effects' ),
	Scale: __( 'Scale', 'od-webgl-effects' ),
	Distortion: __( 'Distortion', 'od-webgl-effects' ),
	Mix: __( 'Mix', 'od-webgl-effects' ),
	Amplitude: __( 'Amplitude', 'od-webgl-effects' ),
	Frequency: __( 'Frequency', 'od-webgl-effects' ),
	'Wave count': __( 'Wave count', 'od-webgl-effects' ),
	'Line thickness': __( 'Line thickness', 'od-webgl-effects' ),
} );
export function Control( { control, value, onChange, colors } ) {
	const props = {
		label: labels()[ control.label ] || control.label,
		value,
		onChange,
	};
	switch ( control.type ) {
		case 'range':
			return (
				<RangeControl
					{ ...props }
					min={ control.min }
					max={ control.max }
					step={ control.step }
				/>
			);
		case 'number':
			return (
				<TextControl
					{ ...props }
					type="number"
					min={ control.min }
					max={ control.max }
					step={ control.step }
					onChange={ ( v ) => onChange( Number( v ) ) }
				/>
			);
		case 'select':
			return <SelectControl { ...props } options={ control.options } />;
		case 'toggle':
			return (
				<ToggleControl
					label={ props.label }
					checked={ Boolean( value ) }
					onChange={ onChange }
				/>
			);
		case 'text':
			return <TextControl { ...props } />;
		case 'color':
		case 'colorPalette':
			return (
				<fieldset>
					<legend>{ props.label }</legend>
					<ColorPalette
						colors={ colors }
						value={ value }
						onChange={ onChange }
						clearable={ false }
					/>
				</fieldset>
			);
		default:
			return null;
	}
}
