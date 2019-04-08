import React, { Component } from 'react';
import { 
  CardBody, ButtonGroup, Row, Col, Tooltip
} from 'reactstrap';
import cogoToast from 'cogo-toast';

import { StandardTemplate } from 'templates';
import { connect } from 'react-redux';

import CreateAccount from './components/CreateAccount';
import Permissionlist from './components/Permissionlist';
import ImportAccount from './components/ImportAccount';

import { panelSelect } from './PermissionPageReducer';
import { fetchStart, accountClear } from 'reducers/permission';
import styled from 'styled-components';
import { PageTitleDivStyled, CardStyled, ButtonPrimary, ButtonSecondary } from 'styled';

const FirstCardStyled = styled(CardStyled)`
  border-top: solid 2px #1173a4;
`
const CustomButton = styled(ButtonSecondary)`
  padding-top: 4px;
  line-height: 15px;
`

class PermissionPage extends Component {

  constructor(props) {
    super(props);

    this.state = {
      resetTooltip: false,
      createTooltip: false
    }

    props.panelSelect("permission-list");

  }

  toggleResetTooltip () {
    this.setState({
      resetTooltip: !this.state.resetTooltip
    })
  };

  render() {

    const { panelSelect, panel, accountClear, fetchStart } = this.props;

    // Initialize local redux store state, then re-fetch MongoDB permissions
    function reInitialize () {
      accountClear();
      fetchStart();
      cogoToast.success("Successfully re-initialized the local storage state", {
        heading: 'Account Storage Reinitialization',
        position: 'bottom-center'
      });
    }
    
    return (
      <StandardTemplate>
        <div className="PermissionPage animated fadeIn">          
          <Row>
            <Col sm="2"></Col>
            <Col sm="8">
              <Row>
                <Col sm="12">
                  <PageTitleDivStyled>Manage Accounts</PageTitleDivStyled>
                </Col>
              </Row>
              <Row>
                <Col sm="12">
                  <FirstCardStyled>                  
                  <CardBody>
                      <Row className="clearfix">
                        <Col sm={12}>
                          <ButtonGroup className="float-right"
                            style={{display: (panel === "permission-list") ? 'block' : 'none'}}>
                                <ButtonPrimary id="CreateAccountBtn" onClick={()=>{panelSelect("create-account")}}>Create Account</ButtonPrimary>
                                <CustomButton id="ResetPermissionBtn" onClick={()=>reInitialize()}>Reset All Permissions</CustomButton>
                          </ButtonGroup>
                          <ButtonPrimary className="float-right" onClick={()=>{panelSelect("permission-list")}}
                            style={{display: (panel === "permission-list") ? 'none' : 'block'}}
                            >
                            Back
                          </ButtonPrimary>
                          <Tooltip placement="top" target="ResetPermissionBtn"
                            isOpen={this.state.resetTooltip && panel === "permission-list"}
                            toggle={()=>this.toggleResetTooltip()}
                            delay={{show: 0, hide: 0}}
                            trigger="hover"
                            autohide={true}>
                            All private keys are stored locally on your machine. Clicking this button will reinitialize 
                            your local storage into the app's default state before fetching accounts from your 
                            current MongoDB instance
                          </Tooltip>
                        </Col>
                      </Row>
                      <br/>
                      <Row>
                        <Col sm={12}>
                          { panel === "permission-list" ? <Permissionlist/>
                            : panel === "create-account" ? <CreateAccount/>
                            : <ImportAccount />
                          }
                        </Col>
                      </Row>
                  </CardBody>
                </FirstCardStyled>
                </Col>
              </Row>            
            </Col>
            <Col sm="2"></Col>
          </Row>
          
          
          
        </div>
      </StandardTemplate>
    );
  }
}

export default connect(
  ({ permission, permissionPage: { panel } }) => ({
    permission, panel,
  }),
  {
    panelSelect,
    fetchStart,
    accountClear
  }
)(PermissionPage);
