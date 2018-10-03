import {
    colors,
    constants as sharedConstants,
    EtherscanLinkSuffixes,
    MarkdownSection,
    NestedSidebarMenu,
    Networks,
    SectionHeader,
    Styles,
    utils as sharedUtils,
} from '@0xproject/react-shared';
import {
    DocAgnosticFormat,
    Event,
    ExternalExportToLink,
    Property,
    SolidityMethod,
    TypeDefinitionByName,
    TypescriptFunction,
    TypescriptMethod,
} from '@0xproject/types';
import * as _ from 'lodash';
import CircularProgress from 'material-ui/CircularProgress';
import * as React from 'react';
import * as semver from 'semver';

import { DocsInfo } from '../docs_info';
import { AddressByContractName, SupportedDocJson } from '../types';
import { constants } from '../utils/constants';

import { Badge } from './badge';
import { Comment } from './comment';
import { EventDefinition } from './event_definition';
import { PropertyBlock } from './property_block';
import { SignatureBlock } from './signature_block';
import { TypeDefinition } from './type_definition';

const networkNameToColor: { [network: string]: string } = {
    [Networks.Kovan]: colors.purple,
    [Networks.Ropsten]: colors.red,
    [Networks.Mainnet]: colors.turquois,
    [Networks.Rinkeby]: colors.darkYellow,
};

export interface DocumentationProps {
    selectedVersion: string;
    availableVersions: string[];
    docsInfo: DocsInfo;
    sourceUrl: string;
    onVersionSelected: (semver: string) => void;
    docAgnosticFormat?: DocAgnosticFormat;
    sidebarHeader?: React.ReactNode;
    topBarHeight?: number;
}

export interface DocumentationState {
    isHoveringSidebar: boolean;
}

export class Documentation extends React.Component<DocumentationProps, DocumentationState> {
    public static defaultProps: Partial<DocumentationProps> = {
        topBarHeight: 0,
    };
    constructor(props: DocumentationProps) {
        super(props);
        this.state = {
            isHoveringSidebar: false,
        };
    }
    public componentDidMount(): void {
        window.addEventListener('hashchange', this._onHashChanged.bind(this), false);
    }
    public componentWillUnmount(): void {
        window.removeEventListener('hashchange', this._onHashChanged.bind(this), false);
    }
    public componentDidUpdate(prevProps: DocumentationProps, _prevState: DocumentationState): void {
        if (!_.isEqual(prevProps.docAgnosticFormat, this.props.docAgnosticFormat)) {
            const hash = window.location.hash.slice(1);
            sharedUtils.scrollToHash(hash, sharedConstants.SCROLL_CONTAINER_ID);
        }
    }
    public render(): React.ReactNode {
        const styles: Styles = {
            mainContainers: {
                position: 'absolute',
                top: 1,
                left: 0,
                bottom: 0,
                right: 0,
                overflowX: 'hidden',
                overflowY: 'scroll',
                minHeight: `calc(100vh - ${this.props.topBarHeight}px)`,
                WebkitOverflowScrolling: 'touch',
            },
            menuContainer: {
                borderColor: colors.grey300,
                maxWidth: 330,
                marginLeft: 20,
            },
        };
        const sectionNameToLinks = this.props.docsInfo.getSectionNameToLinks();
        console.log('sectionNameToLinks', sectionNameToLinks);
        const subsectionNameToLinks = this.props.docsInfo.getSubsectionNameToLinks(this.props.docAgnosticFormat);
        console.log('subsectionNameToLinks', subsectionNameToLinks);
        return (
            <div>
                {_.isUndefined(this.props.docAgnosticFormat) ? (
                    this._renderLoading(styles.mainContainers)
                ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: colors.gray40 }}>
                        <div
                            className="mx-auto max-width-4 flex"
                            style={{ color: colors.grey800, height: `calc(100vh - ${this.props.topBarHeight}px)` }}
                        >
                            <div
                                className="relative sm-hide xs-hide"
                                style={{ width: '36%', height: `calc(100vh - ${this.props.topBarHeight}px)` }}
                            >
                                <div
                                    className="border-right absolute"
                                    style={{
                                        ...styles.menuContainer,
                                        ...styles.mainContainers,
                                        height: `calc(100vh - ${this.props.topBarHeight}px)`,
                                        overflow: this.state.isHoveringSidebar ? 'auto' : 'hidden',
                                    }}
                                    onMouseEnter={this._onSidebarHover.bind(this)}
                                    onMouseLeave={this._onSidebarHoverOff.bind(this)}
                                >
                                    <NestedSidebarMenu
                                        selectedVersion={this.props.selectedVersion}
                                        versions={this.props.availableVersions}
                                        sidebarHeader={this.props.sidebarHeader}
                                        sectionNameToLinks={sectionNameToLinks}
                                        subsectionNameToLinks={subsectionNameToLinks}
                                        onVersionSelected={this.props.onVersionSelected}
                                    />
                                </div>
                            </div>
                            <div
                                className="relative col lg-col-9 md-col-9 sm-col-12 col-12"
                                style={{ backgroundColor: colors.white }}
                            >
                                <div
                                    id={sharedConstants.SCROLL_CONTAINER_ID}
                                    style={styles.mainContainers}
                                    className="absolute px1"
                                >
                                    <div id={sharedConstants.SCROLL_TOP_ID} />
                                    {this._renderDocumentation()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    private _renderLoading(mainContainersStyles: React.CSSProperties): React.ReactNode {
        return (
            <div className="col col-12" style={mainContainersStyles}>
                <div
                    className="relative sm-px2 sm-pt2 sm-m1"
                    style={{ height: 122, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <div className="center pb2">
                        <CircularProgress size={40} thickness={5} />
                    </div>
                    <div className="center pt2" style={{ paddingBottom: 11 }}>
                        Loading documentation...
                    </div>
                </div>
            </div>
        );
    }
    private _renderDocumentation(): React.ReactNode {
        const subMenus = _.values(this.props.docsInfo.menu);
        const orderedSectionNames = _.flatten(subMenus);

        const typeDefinitionByName = this.props.docsInfo.getTypeDefinitionsByName(this.props.docAgnosticFormat);
        const renderedSections = _.map(orderedSectionNames, this._renderSection.bind(this, typeDefinitionByName));

        return renderedSections;
    }
    private _renderSection(typeDefinitionByName: TypeDefinitionByName, sectionName: string): React.ReactNode {
        const markdownVersions = _.keys(this.props.docsInfo.sectionNameToMarkdownByVersion);
        const eligibleVersions = _.filter(markdownVersions, mdVersion => {
            return semver.lte(mdVersion, this.props.selectedVersion);
        });
        if (_.isEmpty(eligibleVersions)) {
            throw new Error(
                `No eligible markdown sections found for ${this.props.docsInfo.displayName} version ${
                    this.props.selectedVersion
                }.`,
            );
        }
        const sortedEligibleVersions = eligibleVersions.sort(semver.rcompare.bind(semver));
        const closestVersion = sortedEligibleVersions[0];
        const markdownFileIfExists = this.props.docsInfo.sectionNameToMarkdownByVersion[closestVersion][sectionName];
        if (!_.isUndefined(markdownFileIfExists)) {
            return (
                <MarkdownSection
                    key={`markdown-section-${sectionName}`}
                    sectionName={sectionName}
                    markdownContent={markdownFileIfExists}
                />
            );
        }

        const docSection = this.props.docAgnosticFormat[sectionName];
        if (_.isUndefined(docSection)) {
            return null;
        }

        const isExportedFunctionSection =
            docSection.functions.length === 1 &&
            _.isEmpty(docSection.types) &&
            _.isEmpty(docSection.methods) &&
            _.isEmpty(docSection.constructors) &&
            _.isEmpty(docSection.properties) &&
            _.isEmpty(docSection.events);

        const sortedTypes = _.sortBy(docSection.types, 'name');
        const typeDefs = _.map(sortedTypes, customType => {
            return (
                <TypeDefinition
                    sectionName={sectionName}
                    key={`type-${customType.name}`}
                    customType={customType}
                    docsInfo={this.props.docsInfo}
                    typeDefinitionByName={typeDefinitionByName}
                    isInPopover={false}
                />
            );
        });

        const sortedProperties = _.sortBy(docSection.properties, 'name');
        const propertyDefs = _.map(
            sortedProperties,
            this._renderProperty.bind(this, sectionName, typeDefinitionByName),
        );

        const sortedMethods = _.sortBy(docSection.methods, 'name');
        const methodDefs = _.map(sortedMethods, method => {
            return this._renderSignatureBlocks(method, sectionName, typeDefinitionByName);
        });

        const sortedFunctions = _.sortBy(docSection.functions, 'name');
        const functionDefs = _.map(sortedFunctions, func => {
            return this._renderSignatureBlocks(func, sectionName, typeDefinitionByName);
        });

        const sortedEvents = _.sortBy(docSection.events, 'name');
        const eventDefs = _.map(sortedEvents, (event: Event, i: number) => {
            return (
                <EventDefinition
                    key={`event-${event.name}-${i}`}
                    event={event}
                    sectionName={sectionName}
                    docsInfo={this.props.docsInfo}
                />
            );
        });
        const headerStyle: React.CSSProperties = {
            fontWeight: 100,
        };
        return (
            <div key={`section-${sectionName}`} className="py2 pr3 md-pl2 sm-pl3">
                <div className="flex pb2">
                    <div style={{ marginRight: 7 }}>
                        <SectionHeader sectionName={sectionName} />
                    </div>
                    {this._renderNetworkBadgesIfExists(sectionName)}
                </div>
                {docSection.comment && <Comment comment={docSection.comment} />}
                {!_.isEmpty(docSection.constructors) && (
                    <div>
                        <h2 style={headerStyle}>Constructor</h2>
                        {this._renderConstructors(docSection.constructors, sectionName, typeDefinitionByName)}
                    </div>
                )}
                {!_.isEmpty(docSection.properties) && (
                    <div>
                        <h2 style={headerStyle}>Properties</h2>
                        <div>{propertyDefs}</div>
                    </div>
                )}
                {!_.isEmpty(docSection.methods) && (
                    <div>
                        <h2 style={headerStyle}>Methods</h2>
                        <div>{methodDefs}</div>
                    </div>
                )}
                {!_.isEmpty(docSection.functions) && (
                    <div>
                        {!isExportedFunctionSection && <h2 style={headerStyle}>Functions</h2>}
                        <div>{functionDefs}</div>
                    </div>
                )}
                {!_.isUndefined(docSection.events) &&
                    docSection.events.length > 0 && (
                        <div>
                            <h2 style={headerStyle}>Events</h2>
                            <div>{eventDefs}</div>
                        </div>
                    )}
                {!_.isUndefined(docSection.externalExportToLink) &&
                    this._renderExternalExports(docSection.externalExportToLink)}
                {!_.isUndefined(typeDefs) &&
                    typeDefs.length > 0 && (
                        <div>
                            <div>{typeDefs}</div>
                        </div>
                    )}
            </div>
        );
    }
    private _renderExternalExports(externalExportToLink: ExternalExportToLink): React.ReactNode {
        const externalExports = _.map(externalExportToLink, (link: string, exportName: string) => {
            return (
                <div className="pt2" key={`external-export-${exportName}`}>
                    <code className={`hljs ${constants.TYPE_TO_SYNTAX[this.props.docsInfo.type]}`}>
                        {`import { `}
                        <a href={link} target="_blank" style={{ color: colors.lightBlueA700, textDecoration: 'none' }}>
                            {exportName}
                        </a>
                        {` } from '${this.props.docsInfo.packageName}'`}
                    </code>
                </div>
            );
        });
        return <div>{externalExports}</div>;
    }
    private _renderNetworkBadgesIfExists(sectionName: string): React.ReactNode {
        if (this.props.docsInfo.type !== SupportedDocJson.SolDoc) {
            return null;
        }

        const networkToAddressByContractName = this.props.docsInfo.contractsByVersionByNetworkId[
            this.props.selectedVersion
        ];
        const badges = _.map(
            networkToAddressByContractName,
            (addressByContractName: AddressByContractName, networkName: string) => {
                const contractAddress = addressByContractName[sectionName];
                if (_.isUndefined(contractAddress)) {
                    return null;
                }
                const linkIfExists = sharedUtils.getEtherScanLinkIfExists(
                    contractAddress,
                    sharedConstants.NETWORK_ID_BY_NAME[networkName],
                    EtherscanLinkSuffixes.Address,
                );
                return (
                    <a
                        key={`badge-${networkName}-${sectionName}`}
                        href={linkIfExists}
                        target="_blank"
                        style={{ color: colors.white, textDecoration: 'none' }}
                    >
                        <Badge title={networkName} backgroundColor={networkNameToColor[networkName]} />
                    </a>
                );
            },
        );
        return badges;
    }
    private _renderConstructors(
        constructors: SolidityMethod[] | TypescriptMethod[],
        sectionName: string,
        typeDefinitionByName: TypeDefinitionByName,
    ): React.ReactNode {
        const constructorDefs = _.map(constructors, constructor => {
            return this._renderSignatureBlocks(constructor, sectionName, typeDefinitionByName);
        });
        return <div>{constructorDefs}</div>;
    }
    private _renderProperty(
        sectionName: string,
        typeDefinitionByName: TypeDefinitionByName,
        property: Property,
    ): React.ReactNode {
        return (
            <PropertyBlock
                key={`property-${property.name}-${property.type.name}`}
                property={property}
                sectionName={sectionName}
                docsInfo={this.props.docsInfo}
                sourceUrl={this.props.sourceUrl}
                selectedVersion={this.props.selectedVersion}
                typeDefinitionByName={typeDefinitionByName}
            />
        );
    }
    private _renderSignatureBlocks(
        method: SolidityMethod | TypescriptFunction | TypescriptMethod,
        sectionName: string,
        typeDefinitionByName: TypeDefinitionByName,
    ): React.ReactNode {
        return (
            <SignatureBlock
                key={`method-${method.name}-${sectionName}`}
                sectionName={sectionName}
                method={method}
                typeDefinitionByName={typeDefinitionByName}
                libraryVersion={this.props.selectedVersion}
                docsInfo={this.props.docsInfo}
                sourceUrl={this.props.sourceUrl}
            />
        );
    }
    private _onSidebarHover(_event: React.FormEvent<HTMLInputElement>): void {
        this.setState({
            isHoveringSidebar: true,
        });
    }
    private _onSidebarHoverOff(): void {
        this.setState({
            isHoveringSidebar: false,
        });
    }
    private _onHashChanged(_event: any): void {
        const hash = window.location.hash.slice(1);
        sharedUtils.scrollToHash(hash, sharedConstants.SCROLL_CONTAINER_ID);
    }
}
