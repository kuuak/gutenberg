/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useRef, useState } from '@wordpress/element';
import { AsyncModeProvider, useSelect } from '@wordpress/data';
import { Popover } from '@wordpress/components';

/**
 * Internal dependencies
 */
import BlockListBlock from './block';
import BlockListAppender from '../block-list-appender';
import __experimentalBlockListFooter from '../block-list-footer';
import useMultiSelection from './use-multi-selection';
import BlockInsertionPoint from './insertion-point';

/**
 * If the block count exceeds the threshold, we disable the reordering animation
 * to avoid laginess.
 */
const BLOCK_ANIMATION_THRESHOLD = 200;

const forceSyncUpdates = ( WrappedComponent ) => ( props ) => {
	return (
		<AsyncModeProvider value={ false }>
			<WrappedComponent { ...props } />
		</AsyncModeProvider>
	);
};

function BlockList( {
	className,
	rootClientId,
	__experimentalMoverDirection: moverDirection = 'vertical',
	isDraggable,
	renderAppender,
	__experimentalUIParts = {},
} ) {
	function selector( select ) {
		const {
			getBlockOrder,
			isMultiSelecting,
			getSelectedBlockClientId,
			getMultiSelectedBlockClientIds,
			hasMultiSelection,
			getGlobalBlockCount,
			isTyping,
		} = select( 'core/block-editor' );

		return {
			blockClientIds: getBlockOrder( rootClientId ),
			isMultiSelecting: isMultiSelecting(),
			selectedBlockClientId: getSelectedBlockClientId(),
			multiSelectedBlockClientIds: getMultiSelectedBlockClientIds(),
			hasMultiSelection: hasMultiSelection(),
			enableAnimation: (
				! isTyping() &&
				getGlobalBlockCount() <= BLOCK_ANIMATION_THRESHOLD
			),
		};
	}

	const {
		blockClientIds,
		isMultiSelecting,
		selectedBlockClientId,
		multiSelectedBlockClientIds,
		hasMultiSelection,
		enableAnimation,
	} = useSelect( selector, [ rootClientId ] );
	const ref = useRef();
	const onSelectionStart = useMultiSelection( { ref, rootClientId } );

	const uiParts = {
		hasMovers: true,
		hasSelectedUI: true,
		...__experimentalUIParts,
	};

	const [ isInserterShown, setIsInserterShown ] = useState( false );
	const [ isInserterForced, setIsInserterForced ] = useState( false );
	const [ inserterPosition, setInserterPosition ] = useState( null );
	const [ inserterClientId, setInserterClientId ] = useState( null );

	function onMouseMove( event ) {
		if ( event.target === ref.current ) {
			const rect = event.target.getBoundingClientRect();
			const offset = event.clientY - rect.top;
			const afterIndex = Array.from( event.target.children ).find( ( blockEl ) => {
				return blockEl.offsetTop > offset;
			} );

			setIsInserterShown( true );
			setInserterPosition( afterIndex );
			setInserterClientId( afterIndex.id.slice( 'block-'.length ) );
		} else {
			setIsInserterShown( false );
		}
	}

	return <>
		{ ( isInserterShown || isInserterForced ) &&
			<Popover
				noArrow
				animate={ false }
				anchorRef={ inserterPosition }
				position="top right left"
				focusOnMount={ false }
				className="block-editor-block-list__block-popover"
				__unstableSlotName="block-toolbar"
			>
				<BlockInsertionPoint
					rootClientId={ rootClientId }
					clientId={ inserterClientId }
					onFocus={ () => setIsInserterForced( true ) }
					onBlur={ () => setIsInserterForced( false ) }
					width={ inserterPosition.offsetWidth }
				/>
			</Popover>
		}
		<div
			ref={ ref }
			className={ classnames(
				'block-editor-block-list__layout',
				className
			) }
			onMouseMove={ isInserterForced ? undefined : onMouseMove }
		>
			{ blockClientIds.map( ( clientId, index ) => {
				const isBlockInSelection = hasMultiSelection ?
					multiSelectedBlockClientIds.includes( clientId ) :
					selectedBlockClientId === clientId;

				return (
					<AsyncModeProvider key={ clientId } value={ ! isBlockInSelection }>
						<BlockListBlock
							rootClientId={ rootClientId }
							clientId={ clientId }
							onSelectionStart={ onSelectionStart }
							isDraggable={ isDraggable }
							moverDirection={ moverDirection }
							isMultiSelecting={ isMultiSelecting }
							// This prop is explicitely computed and passed down
							// to avoid being impacted by the async mode
							// otherwise there might be a small delay to trigger the animation.
							animateOnChange={ index }
							enableAnimation={ enableAnimation }
							hasSelectedUI={ uiParts.hasSelectedUI }
							hasMovers={ uiParts.hasMovers }
						/>
					</AsyncModeProvider>
				);
			} ) }
			<BlockListAppender
				rootClientId={ rootClientId }
				renderAppender={ renderAppender }
			/>
			<__experimentalBlockListFooter.Slot />
		</div>
	</>;
}

// This component needs to always be synchronous
// as it's the one changing the async mode
// depending on the block selection.
export default forceSyncUpdates( BlockList );
