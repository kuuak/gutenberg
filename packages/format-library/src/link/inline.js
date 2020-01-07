/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { withSpokenMessages } from '@wordpress/components';
import { prependHTTP } from '@wordpress/url';
import {
	create,
	insert,
	isCollapsed,
	applyFormat,
	getTextContent,
	slice,
} from '@wordpress/rich-text';
import { __experimentalLinkControl as LinkControl } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { createLinkFormat, isValidHref } from './utils';

function InlineLinkUI( { isActive, activeAttributes, addingLink, value, onChange, speak } ) {
	const anchorRef = useMemo( () => {
		const selection = window.getSelection();

		if ( ! selection.rangeCount ) {
			return;
		}

		const range = selection.getRangeAt( 0 );

		if ( addingLink ) {
			return range;
		}

		let element = range.startContainer;

		// If the caret is right before the element, select the next element.
		element = element.nextElementSibling || element;

		while ( element.nodeType !== window.Node.ELEMENT_NODE ) {
			element = element.parentNode;
		}

		return element.closest( 'a' );
	}, [ isActive, addingLink, value.start, value.end ] );

	if ( ! isActive && ! addingLink ) {
		return null;
	}

	const linkValue = {
		url: activeAttributes.url,
		opensInNewTab: activeAttributes.target === '_blank',
	};
	const onChangeLink = ( newValue ) => {
		const newUrl = prependHTTP( newValue.url );
		const selectedText = getTextContent( slice( value ) );
		const format = createLinkFormat( {
			url: newUrl,
			opensInNewWindow: newValue.opensInNewTab,
			text: selectedText,
		} );

		if ( isCollapsed( value ) && ! isActive ) {
			const toInsert = applyFormat( create( { text: newUrl } ), format, 0, newUrl.length );
			onChange( insert( value, toInsert ) );
		} else {
			onChange( applyFormat( value, format ) );
		}

		if ( ! isValidHref( newUrl ) ) {
			speak( __( 'Warning: the link has been inserted but may have errors. Please test it.' ), 'assertive' );
		} else if ( isActive ) {
			speak( __( 'Link edited.' ), 'assertive' );
		} else {
			speak( __( 'Link inserted.' ), 'assertive' );
		}
	};

	return (
		<LinkControl
			value={ linkValue }
			onChange={ onChangeLink }
			popoverProps={ {
				anchorRef,
				focusOnMount: addingLink ? 'firstElement' : false,
			} }
		/>
	);
}

export default withSpokenMessages( InlineLinkUI );
