import '@polymer/polymer/polymer-legacy.js';
import 'd2l-polymer-siren-behaviors/store/entity-behavior.js';
import './d2l-outer-module.js';
import '@brightspace-ui-labs/accordion/accordion.js';
import '@brightspace-ui/core/components/colors/colors.js';
import 'siren-entity/siren-entity.js';
import '../localize-behavior.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
/*
@memberOf D2L.Polymer.Mixins;
@mixes SirenEntityMixin
*/

class D2LSequenceNavigator extends mixinBehaviors([
	D2L.PolymerBehaviors.Siren.EntityBehavior,
	D2L.PolymerBehaviors.Sequences.LocalizeBehavior
],
PolymerElement
) {
	static get template() {
		return html`
		<style>
			:host {
				display: block;
				height: 100%;
				border-bottom-left-radius: 6px;
				border-bottom-right-radius: 6px;
			}

			:host([is-sidebar]) {
				border: none;
			}

			.module-item-list {
				list-style-type: none;
				padding: 0;
				margin: 0;
			}

			#sidebarContent {
				position: relative;
				overflow-y: auto;
				overflow-x: hidden;
			}

			li:first-of-type d2l-activity-link,
			li:first-of-type {
				margin-top: 10px;
			}

			li:last-of-type {
				margin-bottom: 10px;
			}

			li {
				padding-top: 6px;
			}

			.module-content {
				padding: 0 30px;
			}

			@media(max-width: 929px) {
				.module-content {
					padding: 0 24px;
				}
			}

			@media(max-width: 767px) {
				.module-content {
					padding: 0 18px;
				}
			}
		</style>
		<siren-entity href="[[rootHref]]" token="[[token]]" entity="{{_lessonEntity}}"></siren-entity>
		<slot name="lesson-header"></slot>
		<d2l-labs-accordion auto-close="" class="module-content" id="sidebarContent" on-scroll="onSidebarScroll">
			<ol class="module-item-list">
				<template is="dom-repeat" items="[[subEntities]]" as="childLink">
					<template is="dom-if" if="[[childLink.href]]">
						<li>
							<template is="dom-if" if="[[!_isActivity(childLink)]]">
								<d2l-outer-module
									href="[[childLink.href]]"
									token="[[token]]"
									current-activity="{{href}}"
									last-module="[[isLast(subEntities, index)]]"
									last-viewed-content-object="[[lastViewedContentObject]]"
									on-d2l-content-entity-loaded="checkIfChildrenDoneLoading"
									show-loading-skeleton="[[_showChildSkeletons(showLoadingSkeleton, _childrenLoading)]]"
									is-sidebar="[[isSidebar]]"
								>
								</d2l-outer-module>
							</template>
							<template is="dom-if" if="[[_isActivity(childLink)]]">
								<d2l-activity-link
									href="[[childLink.href]]"
									token="[[token]]"
									current-activity="{{href}}"
									show-underline="[[_nextActivitySiblingIsActivity(subEntities, index)]]"
									on-d2l-content-entity-loaded="checkIfChildrenDoneLoading"
									show-loading-skeleton="[[_showChildSkeletons(showLoadingSkeleton, _childrenLoading)]]"
								>
								</d2l-activity-link>
							</template>
						</li>
					</template>
				</template>
			</ol>
			<slot name="end-of-unit"></slot>
		</d2l-labs-accordion>
		`;
	}

	static get is() {
		return 'd2l-sequence-navigator';
	}
	static get properties() {
		return {
			dataAsvCssVars: String,
			href: {
				type: String,
				reflectToAttribute: true,
				notify: true
			},
			role: {
				type: String
			},
			rootHref: {
				type: String,
				computed: '_getRootHref(entity)'
			},
			subEntities: {
				type: Array,
				computed: 'getSubEntities(_lessonEntity)'
			},
			_lessonEntity:{
				type: Object
			},
			lastViewedContentObject: {
				type: String
			},
			showLoadingSkeleton: {
				type: Boolean,
				value: true
			},
			_childrenLoading: {
				type: Boolean,
				value: true
			},
			_childrenLoadingTracker: {
				type: Object,
				computed: '_setUpChildrenLoadingTracker(subEntities)'
			},
			isSidebar: {
				type: Boolean,
				reflectToAttribute: true,
				value: false
			}
		};
	}

	static get observers() {
		return [
			'_checkForEarlyLoadEvent(entity, subEntities)'
		];
	}

	ready() {
		super.ready();
		const styles = this.dataAsvCssVars && JSON.parse(this.dataAsvCssVars) ||
			JSON.parse(document.getElementsByTagName('html')[0].getAttribute('data-asv-css-vars'));

		this.updateStyles(
			styles
		);
	}

	_getRootHref(entity) {
		const rootLink = entity && entity.getLinkByRel('https://sequences.api.brightspace.com/rels/sequence-root');
		return rootLink && rootLink.href || '';
	}

	getSubEntities(entity) {
		return entity && entity.getSubEntities()
			.filter(subEntity =>
				((subEntity.properties && Object.keys(subEntity.properties).length > 0) || subEntity.href) && !subEntity.hasClass('unavailable'))
			.map(this._getHref);
	}

	_isActivity(link) {
		return link && link.hasClass('sequenced-activity');
	}

	_getHref(entity) {
		return entity && entity.getLinkByRel && entity.getLinkByRel('self') || entity || '';
	}

	_nextActivitySiblingIsActivity(subEntities, index) {
		if (index >= subEntities.length) {
			return false;
		}

		const nextSibling = subEntities[index + 1];

		return this._isActivity(nextSibling);
	}

	isLast(entities, index) {
		return entities.length <= index + 1;
	}

	_setUpChildrenLoadingTracker(subEntities) {
		if (!subEntities) {
			return {};
		}

		return subEntities.reduce((acc, { href }) => {
			let hasLoaded = false;
			if (this._childrenLoadingTracker && this._childrenLoadingTracker[href]) {
				hasLoaded = this._childrenLoadingTracker[href];
			}
			return {
				...acc,
				[href]: hasLoaded
			};
		}, {});
	}

	checkIfChildrenDoneLoading(contentLoadedEvent) {
		const childHref = contentLoadedEvent.detail.href;

		if (!this._childrenLoadingTracker || !this._childrenLoading) {
			return;
		}

		if (this._childrenLoadingTracker[childHref] !== undefined) {
			this._childrenLoadingTracker[childHref] = true;
			contentLoadedEvent.stopPropagation();
		}

		if (!Object.values(this._childrenLoadingTracker).some(loaded => !loaded)) {
			this._childrenLoading = false;
			this.dispatchEvent(new CustomEvent('d2l-content-entity-loaded', {detail: { href: this.href}}));
		}
	}

	_checkForEarlyLoadEvent(entity, subEntities) {
		if (entity &&
			subEntities && (
			subEntities.length <= 0 ||
			subEntities.find(({ rel }) => rel && rel.includes('item')))
		) {
			this.dispatchEvent(new CustomEvent('d2l-content-entity-loaded', {detail: { href: this.href}}));
		}
	}

	_showChildSkeletons(showLoadingSkeleton, _childrenLoading) {
		return showLoadingSkeleton || _childrenLoading;
	}
}

window.customElements.define(D2LSequenceNavigator.is, D2LSequenceNavigator);
